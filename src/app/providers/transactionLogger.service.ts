import { Injectable } from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { EtherDataService } from './etherData.service';
import { WalletService, WalletTypes } from './wallet.service';
import { KyberNetworkService } from './kybernetwork.service';
import { Provider } from 'ethers/providers';
import { BigNumber, BigNumberish } from 'ethers/utils';
import {
  AppStorageTypes,
  AppStorageService
} from '../providers/appStorage.service';

import { env } from '../../environments/environment';
import { FeedbackUIService } from './feedbackUI.service';
import { Observable, Subscriber } from 'rxjs';
import { listutil, SubscriptionHandler } from '../utils/listutil';
import { Consts } from '../../environments/constants';

import { Events } from '@ionic/angular';
import { EtherApiService } from './etherApi.service';
import { EdnRemoteApiService } from './ednRemoteApi.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionLoggerService {
  constructor(
    private storage: AppStorageService,
    private events: Events,
    public eths: EthService,
    private logger: NGXLogger,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherData: EtherDataService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService
  ) {} //end of constructor

  initEvents() {
    this.setETHEvents();
    this.setERC20Events();
    this.setKyberNetworkEvents();
  }
  setETHEvents() {
    this.events.subscribe(
      'eth.send.tx.create',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          sendEthTo: string;
          sendWeiAmount: BigNumber;
          customLogData?: any;
        },
        tx: any
      ) => {
        /** transaction info */
        this.storage.addTx(
          AppStorageTypes.TxType.EthTransfer,
          AppStorageTypes.TxSubType.Send,
          {
            from: params.walletInfo.address,
            to: params.sendEthTo,
            amount: {
              value: params.sendWeiAmount.toHexString(),
              decimal: Consts.ETH_DECIMAL,
              display: ethers.utils.formatEther(params.sendWeiAmount)
            }
          },
          params.customLogData,
          params.walletInfo,
          tx.hash,
          AppStorageTypes.TxState.Created,
          new Date(),
          null
        );
      }
    );

    this.events.subscribe(
      'eth.send.tx.receipt',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          sendEthTo: string;
          sendWeiAmount: BigNumber;
          customLogData?: any;
        },
        txReceipt: any
      ) => {
        this.storage.addTxLog(
          AppStorageTypes.TxRowState.Closed,
          params.walletInfo,
          txReceipt.transactionHash,
          AppStorageTypes.TxState.Receipted,
          new Date(),
          null
        );
      }
    );

    this.events.subscribe('eth.send.error', () => {});
  }
  setERC20Events() {
    this.events.subscribe(
      'eth.erc20.send.tx.create',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          ctInfo: WalletTypes.ContractInfo;
          toAddress: string;
          srcAmount: BigNumber;
          customLogData?: any;
        },
        tx: any
      ) => {
        /** transaction info */
        this.storage.addTx(
          AppStorageTypes.TxType.EthERC20Transfer,
          AppStorageTypes.TxSubType.Send,
          {
            from: params.walletInfo.address,
            to: params.toAddress,
            amount: {
              value: params.srcAmount.toHexString(),
              decimal: params.ctInfo.contractInfo.decimal,
              display: ethers.utils.formatUnits(
                params.srcAmount,
                params.ctInfo.contractInfo.decimal
              )
            }
          },
          params.customLogData,
          params.walletInfo,
          tx.hash,
          AppStorageTypes.TxState.Created,
          new Date(),
          null
        );
      }
    );

    this.events.subscribe(
      'eth.erc20.send.tx.receipt',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          ctInfo: WalletTypes.ContractInfo;
          toAddress: string;
          srcAmount: BigNumber;
          customLogData?: any;
        },
        txReceipt: any
      ) => {
        const updatedTx: AppStorageTypes.TxRowData = this.storage.addTxLog(
          AppStorageTypes.TxRowState.Closed,
          params.walletInfo,
          txReceipt.transactionHash,
          AppStorageTypes.TxState.Receipted,
          new Date(),
          null
        );

        this.checkAndRunDepositToTEDN(params.walletInfo, updatedTx);
      }
    );
  }

  setKyberNetworkEvents() {
    this.events.subscribe(
      'exchange.kyber.tx.create',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          targetErc20ContractAddres: string;
          srcEthAmount: BigNumber;
          customLogData?: any;
        },
        tx: any
      ) => {
        const p: EthProviders.Base = this.eths.getProvider(
          params.walletInfo.info.provider
        );

        /** transaction info */
        this.storage.addTx(
          AppStorageTypes.TxType.KyberNetworkTrade,
          AppStorageTypes.TxSubType.Trade,
          {
            from: {
              network: 'ETH',
              type: 'ETH',
              address: this.etherData.contractResolver.getETH(p)
            },
            to: {
              network: 'ETH',
              type: 'ERC20',
              address: params.targetErc20ContractAddres
            },
            amount: {
              value: params.srcEthAmount.toHexString(),
              decimal: Consts.ETH_DECIMAL,
              display: ethers.utils.formatEther(params.srcEthAmount)
            }
          },
          params.customLogData,
          params.walletInfo,
          tx.hash,
          AppStorageTypes.TxState.Created,
          new Date(),
          null
        );
      }
    );

    this.events.subscribe(
      'exchange.kyber.tx.receipt',
      (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          targetErc20ContractAddres: string;
          srcEthAmount: BigNumber;
          customLogData?: any;
        },
        txReceipt
      ) => {
        this.storage.addTxLog(
          AppStorageTypes.TxRowState.Closed,
          params.walletInfo,
          txReceipt.transactionHash,
          AppStorageTypes.TxState.Receipted,
          new Date(),
          null
        );
      }
    );
  } //end of kybernetwork events

  trackUnclosedTxLogs() {
    this.logger.debug('track trackUnclosedTxLogs');

    const filter = (item: AppStorageTypes.TxRowData) => {
      const customData = item.customData;
      if (customData) {
        if (
          customData.filter === 'tedn.deposit' &&
          customData.postedToEdnServer === false
        ) {
          return true;
        }
      }

      return false;
    };

    const wallets = this.storage.getWallets(true, false);
    wallets.forEach(wallet => {
      //{ filter: 'tedn.deposit', postedToEdnServer: false }

      const incompleteTxList: Array<
        AppStorageTypes.TxRowData
      > = this.storage.getIncompleteTxList(wallet, filter);

      //update search limit if empty array
      if (incompleteTxList.length === 0) {
        const txInfo = this.storage.getTxInfo(wallet);
        if (txInfo.incompleteSearchIndex !== txInfo.endIndex) {
          txInfo.incompleteSearchIndex = txInfo.endIndex;
          this.storage.setTxInfo(wallet, txInfo);
        }
      }

      const p: EthProviders.Base = this.eths.getProvider(wallet.info.provider);

      incompleteTxList.forEach((incompleteTx: AppStorageTypes.TxRowData) => {
        this.etherApi
          .trackTransactionReceipt(p, incompleteTx.hash)
          .then((txReceipt: any) => {
            this.storage.addTxLog(
              AppStorageTypes.TxRowState.Closed,
              wallet,
              txReceipt.transactionHash,
              AppStorageTypes.TxState.Receipted,
              new Date(),
              null
            );

            this.checkAndRunDepositToTEDN(wallet, incompleteTx);
          });
      });
    });
  } //end of trackUnclosedLogs

  checkAndRunDepositToTEDN(
    wallet: WalletTypes.WalletInfo,
    txRowData: AppStorageTypes.TxRowData
  ) {
    if (!txRowData) {
      return;
    }
    const customData = txRowData.customData;
    if (!customData) {
      return;
    }

    if (
      customData.filter === 'tedn.deposit' &&
      customData.postedToEdnServer === false
    ) {
      this.runDepositToTEDN(wallet, txRowData.hash);
    }
  }

  runDepositToTEDN(wallet: WalletTypes.WalletInfo, txHash: string) {
    this.ednApi.depositToTEDN(txHash).then(
      result => {
        this.storage.updateTxCustomData(wallet, txHash, {
          filter: 'tedn.deposit',
          postedToEdnServer: true
        });
      },
      error => {}
    );
  }
}
