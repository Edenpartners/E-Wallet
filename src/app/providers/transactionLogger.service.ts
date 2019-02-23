import { Injectable } from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { EtherDataService } from './etherData.service';
import { WalletService, WalletTypes } from './wallet.service';
import { Provider } from 'ethers/providers';
import { BigNumber, BigNumberish } from 'ethers/utils';
import { AppStorageTypes, AppStorageService } from '../providers/appStorage.service';

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
    private etherData: EtherDataService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService
  ) {} //end of constructor

  initEvents() {
    this.setETHEvents();
    this.setERC20Events();
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
        const ethTxInfo: AppStorageTypes.Tx.EthTxRowInfo = {
          from: params.walletInfo.address,
          to: params.sendEthTo,
          amount: {
            value: params.sendWeiAmount.toHexString(),
            decimal: Consts.ETH_DECIMAL,
            display: ethers.utils.formatEther(params.sendWeiAmount)
          }
        };

        /** transaction info */
        this.storage.addTx(
          AppStorageTypes.Tx.TxType.EthTransfer,
          AppStorageTypes.Tx.TxSubType.Send,
          ethTxInfo,
          params.customLogData,
          params.walletInfo,
          tx.hash,
          AppStorageTypes.Tx.TxState.Created,
          new Date(),
          tx
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
          AppStorageTypes.Tx.TxRowState.Closed,
          params.walletInfo,
          txReceipt.transactionHash,
          AppStorageTypes.Tx.TxState.Receipted,
          new Date(),
          txReceipt
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
        const ethTxInfo: AppStorageTypes.Tx.EthTxRowInfo = {
          from: params.walletInfo.address,
          to: params.toAddress,
          amount: {
            value: params.srcAmount.toHexString(),
            decimal: params.ctInfo.contractInfo.decimal,
            display: ethers.utils.formatUnits(params.srcAmount, params.ctInfo.contractInfo.decimal)
          }
        };

        /** transaction info */
        this.storage.addTx(
          AppStorageTypes.Tx.TxType.EthERC20Transfer,
          AppStorageTypes.Tx.TxSubType.Send,
          ethTxInfo,
          params.customLogData,
          params.walletInfo,
          tx.hash,
          AppStorageTypes.Tx.TxState.Created,
          new Date(),
          tx
        );
      }
    );

    this.events.subscribe(
      'eth.erc20.send.tx.receipt',
      async (
        params: {
          walletInfo: WalletTypes.EthWalletInfo;
          ctInfo: WalletTypes.ContractInfo;
          toAddress: string;
          srcAmount: BigNumber;
          customLogData?: any;
        },
        txReceipt: any
      ) => {
        const updatedTx: AppStorageTypes.Tx.TxRowData = await this.storage.addTxLog(
          AppStorageTypes.Tx.TxRowState.Closed,
          params.walletInfo,
          txReceipt.transactionHash,
          AppStorageTypes.Tx.TxState.Receipted,
          new Date(),
          txReceipt
        );

        this.checkAndRunDepositToTEDN(params.walletInfo, updatedTx);
      }
    );
  }

  trackUnclosedTxLogs() {
    this.logger.debug('track trackUnclosedTxLogs');

    const wallets = this.storage.getWallets(false, false);
    wallets.forEach(async wallet => {
      const incompleteTxList: Array<AppStorageTypes.Tx.TxRowData> = await this.storage.getIncompleteTxList(wallet, 'tedn.deposit.unposted');

      const p: EthProviders.Base = this.eths.getProvider(wallet.info.provider);

      incompleteTxList.forEach((incompleteTx: AppStorageTypes.Tx.TxRowData) => {
        if (incompleteTx.state === AppStorageTypes.Tx.TxRowState.Opened) {
          this.etherApi.trackTransactionReceipt(p, incompleteTx.hash).then((txReceipt: any) => {
            this.storage.addTxLog(
              AppStorageTypes.Tx.TxRowState.Closed,
              wallet,
              txReceipt.transactionHash,
              AppStorageTypes.Tx.TxState.Receipted,
              new Date(),
              null
            );

            this.checkAndRunDepositToTEDN(wallet, incompleteTx);
          });
        } else {
          this.checkAndRunDepositToTEDN(wallet, incompleteTx);
        }
      });
    });
  } //end of trackUnclosedLogs

  checkAndRunDepositToTEDN(wallet: WalletTypes.WalletInfo, txRowData: AppStorageTypes.Tx.TxRowData) {
    if (!txRowData) {
      return;
    }
    const customData = txRowData.customData;
    if (!customData) {
      return;
    }

    if (customData === 'tedn.deposit.unposted') {
      this.runDepositToTEDN(wallet, txRowData.hash);
    }
  }

  runDepositToTEDN(wallet: WalletTypes.WalletInfo, txHash: string) {
    this.ednApi.depositToTEDN(txHash).then(
      result => {
        this.storage.updateTxCustomData(wallet, txHash, 'tedn.deposit.posted');
      },
      error => {}
    );
  }
}
