import { Component, OnInit, Inject, OnDestroy, ViewChild } from '@angular/core';
import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval } from 'rxjs';
import { EtherDataService } from '../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../providers/kybernetwork.service';
import { EtherApiService } from '../../providers/etherApi.service';
import { Bip39Handler } from '../../components/testers/bip39-handler';
import { EthProviderMaker } from '../../components/testers/eth-provider-maker';
import {
  EthWalletManager,
  WalletRow
} from '../../components/testers/eth-wallet-manager';
import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

@Component({
  selector: 'app-ethtest',
  templateUrl: './ethtest.page.html',
  styleUrls: ['./ethtest.page.scss']
})
export class EthtestPage implements OnInit, OnDestroy {
  title = '';

  @ViewChild(Bip39Handler) bip39Handler: Bip39Handler;
  @ViewChild(EthProviderMaker) ethProviderMaker: EthProviderMaker;
  @ViewChild(EthWalletManager) ethWalletManager: EthWalletManager;

  constructor(
    private storage: AppStorageService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherApi: EtherApiService
  ) {}

  get selectedWallet(): WalletRow {
    return this.ethWalletManager.getSelectedWallet();
  }

  get selectedContract(): WalletTypes.ContractInfo {
    if (this.selectedWallet) {
      return this.selectedWallet.selectedContract;
    }
    return null;
  }

  getSelectedContractDesc() {
    const contract = this.selectedContract;
    if (!contract) {
      return '';
    }

    if (!contract.contractInfo) {
      return contract.type + '/' + contract.address;
    }

    return (
      contract.type +
      ' / ' +
      contract.address +
      ' / Name : ' +
      contract.contractInfo.name +
      ' / Symbol :' +
      contract.contractInfo.symbol +
      ' / Decimal :' +
      contract.contractInfo.decimal
    );
  }

  ngOnInit() {
    this.logger.debug('ethtest component init');
  }

  ngOnDestroy() {
    this.logger.debug('ethtest component destroyed');
  }

  wipeData() {
    this.store.clear();
    window.location.reload();
  }

  copyToClipboard(text: string) {
    this.cbService.copyFromContent(text);
  }

  txToString(tx: any): string {
    return JSON.stringify(tx);
  }

  restoreWallet() {
    const mWords = this.bip39Handler.getTrimmedMWords();
    if (mWords.length < 1) {
      alert('input mnemonic words!');
      return;
    }

    const path = this.bip39Handler.getBIP39DerivationPath();

    if (!this.ethProviderMaker.selectedWalletProviderType) {
      alert('select wallet provider!');
      return;
    }

    if (!this.ethProviderMaker.selectedWalletConnectionInfo) {
      alert('input wallet provider connection info!');
      return;
    }

    const walletInfo = this.walletService.createWalletInfoToStore(
      mWords,
      path,
      this.ethProviderMaker.selectedWalletProviderType,
      this.ethProviderMaker.selectedWalletConnectionInfo,
      null
    );
    this.storage.addWallet(walletInfo);
  }

  encryptWalletToJson(wallet: Wallet) {
    wallet.encrypt(this.cfg.tempEncPassword).then(
      val => {
        console.log('encripted');
        console.log(val);
      },
      reason => {
        console.log('enc failed');
      }
    );
  }

  /**
   * Transactions
   */
  sendEth(sendEthToInput: Input, sendEthAmountInput: Input) {
    if (!this.selectedWallet) {
      alert('select wallet');
      return;
    }

    const sendEthTo = sendEthToInput.value;
    if (sendEthTo.length < 1) {
      alert('set receiver address');
      return;
    }

    const sendEthAmount = sendEthAmountInput.value;
    const sendEthAmountBn: BigNumber = ethers.utils.parseEther(sendEthAmount);
    if (!sendEthAmountBn) {
      alert('set eth amount');
      return;
    }

    const onTxCreate = tx => {
      this.selectedWallet.transactionHistory.push(tx);
      this.store.set(
        'tx_' + this.selectedWallet.data.id,
        this.selectedWallet.transactionHistory
      );
    };

    this.etherApi
      .sendEth(
        this.selectedWallet.data,
        sendEthTo,
        sendEthAmountBn,
        -1,
        onTxCreate
      )
      .then(
        txReceipt => {
          alert('tx complete');
        },
        error => {
          alert(error);
        }
      );
  }

  transferERC20Token(toAddressInput: Input, sendingAmountInput: Input) {
    if (!this.selectedWallet) {
      alert('select wallet');
      return;
    }
    if (!this.selectedWallet.selectedContract) {
      alert('select contract');
      return;
    }
    if (!this.selectedWallet.selectedContract.contractInfo) {
      alert('retrieve contract info');
      return;
    }

    const walletRow = this.selectedWallet;
    const contractInfo: WalletTypes.ContractInfo = walletRow.selectedContract;

    const onTransactionCreate = tx => {
      /** transaction info */
      walletRow.transactionHistory.push(tx);
      this.store.set('tx_' + walletRow.data.id, walletRow.transactionHistory);
    };
    const onTransactionReceipt = txReceipt => {
      this.logger.log('transaction receipt');
    };

    const onSuccess = data => {};
    const onError = error => {
      this.logger.debug('event : transfer failed!');
      this.logger.debug(error);
    };
    this.etherApi
      .transferERC20Token(
        walletRow.data,
        contractInfo,
        toAddressInput.value,
        sendingAmountInput.value,
        -1,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  /**
   * Kybernetwork
   * https://developer.kyber.network/docs/WalletsGuide/
   * https://developer.kyber.network/docs/CodesAppendix/#broadcasting-transactions
   * https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol
   * ERC 20 sol : https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/ERC20.sol
   */
  kyberNetworkTradeEthToErc20Token(
    kyberTradeEthToErcTargetAddressInput: Input,
    kyberTradeEthToErcAmountInput: Input
  ) {
    if (!this.selectedWallet) {
      alert('select an wallet first');
      return;
    }

    const onTxCreate = txData => {
      this.logger.debug('on tx create');
      this.selectedWallet.transactionHistory.push(txData);
      this.store.set(
        'tx_' + this.selectedWallet.data.id,
        this.selectedWallet.transactionHistory
      );
    };
    const onTxReceipt = txReceiptData => {
      this.logger.debug('on tx receipt');
    };

    const onSuccess = data => {
      console.log(data);
    };
    const onError = error => {
      alert(error);
    };
    this.etherApi
      .kyberNetworkTradeEthToErc20Token(
        this.selectedWallet.data,
        kyberTradeEthToErcTargetAddressInput.value,
        kyberTradeEthToErcAmountInput.value,
        onTxCreate,
        onTxReceipt
      )
      .then(onSuccess, onError);
  }

  // ====================================
  // Old Testing Codes
  // ====================================

  encJsonToWallet(json: string, password: string) {
    ethers.Wallet.fromEncryptedJson(json, password).then(result => {
      console.log('wallet restored');
      console.log(result);
    });
  }

  convertWalletToJson(wallet: Wallet): any {
    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic,
      path: wallet.path,
      privateKey: wallet.privateKey
    };
  }

  convertToBigNumber(text: string, resultInput: Input) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }

  convertHexToBigNumber(text: string, resultInput: Input) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }
}
