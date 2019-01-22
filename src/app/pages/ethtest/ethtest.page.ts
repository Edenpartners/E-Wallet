import { Component, OnInit, Inject, OnDestroy, ViewChild } from '@angular/core';
import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherDataService } from '../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { IonInput } from '@ionic/angular';
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

import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-ethtest',
  templateUrl: './ethtest.page.html',
  styleUrls: ['./ethtest.page.scss']
})
export class EthtestPage implements OnInit, OnDestroy {
  title = '';
  pinCode = '';
  oldPinCode = '';

  @ViewChild(Bip39Handler) bip39Handler: Bip39Handler;
  @ViewChild(EthProviderMaker) ethProviderMaker: EthProviderMaker;
  @ViewChild(EthWalletManager) ethWalletManager: EthWalletManager;

  constructor(
    private storage: AppStorageService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  setPinCode() {
    if (this.pinCode.length === 6) {
      this.storage.setPinNumber(this.pinCode, this.oldPinCode);
      this.ethWalletManager.refreshList(true);
    } else {
      this.feedbackUI.showErrorDialog('pin code error!');
    }
  }

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

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.logger.debug('ethtest component init');
  }

  ionViewDidLeave() {
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
      this.feedbackUI.showErrorDialog('input mnemonic words!');
      return;
    }

    const path = this.bip39Handler.getBIP39DerivationPath();

    if (!this.ethProviderMaker.selectedWalletProviderType) {
      this.feedbackUI.showErrorDialog('select wallet provider!');
      return;
    }

    if (!this.ethProviderMaker.selectedWalletConnectionInfo) {
      this.feedbackUI.showErrorDialog('input wallet provider connection info!');
      return;
    }

    const walletPw = this.storage.getWalletPasswordWithValidate(this.pinCode);
    if (!walletPw) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.pincode.areEqual')
      );
      return;
    }

    const walletInfo = this.walletService.createEthWalletInfoToStore(
      mWords,
      path,
      this.ethProviderMaker.selectedWalletProviderType,
      this.ethProviderMaker.selectedWalletConnectionInfo,
      walletPw
    );
    this.storage.addWallet(walletInfo);
  }

  encryptWalletToJson(wallet: Wallet) {
    wallet.encrypt('1234').then(
      val => {
        this.logger.debug('encripted');
        this.logger.debug(val);
      },
      reason => {
        this.logger.debug('enc failed');
      }
    );
  }

  /**
   * Transactions
   */
  sendEth(sendEthToInput: IonInput, sendEthAmountInput: IonInput) {
    if (!this.selectedWallet) {
      this.feedbackUI.showErrorDialog('select wallet');
      return;
    }

    const sendEthTo = sendEthToInput.value;
    if (sendEthTo.length < 1) {
      this.feedbackUI.showErrorDialog('set receiver address');
      return;
    }

    const sendEthAmount = sendEthAmountInput.value;
    const sendEthAmountBn: BigNumber = ethers.utils.parseEther(sendEthAmount);
    if (!sendEthAmountBn) {
      this.feedbackUI.showErrorDialog('set eth amount');
      return;
    }

    const walletPw = this.storage.getWalletPasswordWithValidate(this.pinCode);
    if (walletPw === null) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.pincode.areEqual')
      );
      return;
    }

    const onTxCreate = tx => {};

    this.etherApi
      .sendEth(
        {
          walletInfo: this.selectedWallet.data,
          sendEthTo: sendEthTo,
          sendWeiAmount: sendEthAmountBn
        },
        walletPw,
        onTxCreate
      )
      .then(
        txReceipt => {
          this.feedbackUI.showErrorDialog('tx complete');
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      );
  }

  transferERC20Token(toAddressInput: IonInput, sendingAmountInput: IonInput) {
    if (!this.selectedWallet) {
      this.feedbackUI.showErrorDialog('select wallet');
      return;
    }
    if (!this.selectedWallet.selectedContract) {
      this.feedbackUI.showErrorDialog('select contract');
      return;
    }
    if (!this.selectedWallet.selectedContract.contractInfo) {
      this.feedbackUI.showErrorDialog('retrieve contract info');
      return;
    }

    const walletRow = this.selectedWallet;
    const contractInfo: WalletTypes.ContractInfo = walletRow.selectedContract;

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(
        sendingAmountInput.value,
        contractInfo.contractInfo.decimal
      );
    } catch (e) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
      );
      return;
    }

    const walletPw = this.storage.getWalletPasswordWithValidate(this.pinCode);
    if (walletPw === null) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.pincode.areEqual')
      );
      return;
    }

    const onTransactionCreate = tx => {};
    const onTransactionReceipt = txReceipt => {};

    const onSuccess = data => {};
    const onError = error => {
      this.logger.debug('event : transfer failed!');
      this.logger.debug(error);
    };
    this.etherApi
      .transferERC20Token(
        {
          walletInfo: walletRow.data,
          ctInfo: contractInfo,
          toAddress: toAddressInput.value,
          srcAmount: adjustedAmount
        },
        walletPw,
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
    kyberTradeEthToErcTargetAddressInput: IonInput,
    kyberTradeEthToErcAmountInput: IonInput
  ) {
    if (!this.selectedWallet) {
      this.feedbackUI.showErrorDialog('select an wallet first');
      return;
    }

    const onTxCreate = txData => {
      this.logger.debug('on tx create');
    };
    const onTxReceipt = txReceiptData => {
      this.logger.debug('on tx receipt');
    };

    const onSuccess = data => {
      this.logger.debug(data);
    };
    const onError = error => {
      this.feedbackUI.showErrorDialog(error);
    };

    const walletPw = this.storage.getWalletPasswordWithValidate(this.pinCode);
    if (walletPw === null) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.pincode.areEqual')
      );
      return;
    }

    const etherAmountBn = ethers.utils.parseEther(
      kyberTradeEthToErcAmountInput.value
    );
    this.etherApi
      .kyberNetworkTradeEthToErc20Token(
        {
          walletInfo: this.selectedWallet.data,
          targetErc20ContractAddres: kyberTradeEthToErcTargetAddressInput.value,
          srcEthAmount: etherAmountBn
        },
        walletPw,
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
      this.logger.debug('wallet restored');
      this.logger.debug(result);
    });
  }

  convertToBigNumber(text: string, resultInput: IonInput) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }

  convertHexToBigNumber(text: string, resultInput: IonInput) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }
  convertHexToText(text: string, resultInput: IonInput) {}
}
