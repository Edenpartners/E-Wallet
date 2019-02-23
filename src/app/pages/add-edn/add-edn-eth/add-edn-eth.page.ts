import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { Keyboard } from '@ionic-native/keyboard/ngx';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { IonInput, Platform } from '@ionic/angular';

import { DataTrackerService, ValueTracker } from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { env } from '../../../../environments/environment';
import { Consts } from '../../../../environments/constants';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';

import { IonComponentUtils } from '../../../utils/ion-component-utils';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { BigNumberHelper } from '../../../utils/bigNumberHelper';

const AnalyticsCategory = 'add edn from eth';

export enum EthExchangerId {
  KyberNetwork = 'KyberNetwork',
  IDEX = 'IDEX'
}

interface EthExchanger {
  name: string;
  id: EthExchangerId;
}

@Component({
  selector: 'app-add-edn-eth',
  templateUrl: './add-edn-eth.page.html',
  styleUrls: ['./add-edn-eth.page.scss']
})
export class AddEdnEthPage implements OnInit, OnDestroy {
  selectedTrader: string = null;
  exchangers: Array<EthExchanger> = [];

  selectedWalletId: string = null;
  wallets: Array<WalletTypes.EthWalletInfo> = [];

  @ViewChild('ethAmountInput') ethAmountInput: IonInput;
  @ViewChild('ednAmountInput') ednAmountInput: IonInput;

  lockEthAmountChangeEvent = false;
  lockEdnAmountChangeEvent = false;

  ednAmount = '0';
  ethAmount = '0';

  pinCodeConfirmCallback = null;

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  viewActivated = false;
  lastFocusedInput = 'eth';

  constructor(
    private rs: RouterService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private keyboard: Keyboard,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.refreshWalletList();
    this.exchangers = [];

    ///IDEX only available with mainnet
    if (env.config.ednEthNetwork === EthProviders.KnownNetworkType.homestead) {
      this.exchangers.push({ name: 'IDEX', id: EthExchangerId.IDEX });
    }

    this.exchangers.push({ name: 'Kyber Network', id: EthExchangerId.KyberNetwork });
    this.selectedTrader = this.exchangers[0].id;
  }

  ngOnDestroy() {}

  ionViewWillEnter() {
    this.viewActivated = true;
    this.refreshWalletList();
    this.restartRateTracker();

    this.subscriptionPack.addSubscription(() => {
      return this.keyboard.onKeyboardShow().subscribe((val: any) => {});
    });

    this.events.subscribe(Consts.EVENT_PIN_CODE_RESULT, walletPw => {
      if (this.pinCodeConfirmCallback && walletPw) {
        this.pinCodeConfirmCallback(walletPw);
      }
      this.pinCodeConfirmCallback = null;
    });
  }

  ionViewWillLeave() {
    this.viewActivated = false;
  }

  ionViewDidLeave() {
    this.subscriptionPack.clear();
    this.pinCodeConfirmCallback = null;
    this.events.unsubscribe(Consts.EVENT_PIN_CODE_RESULT);

    this.dataTracker.stopTracker('ednRateTrackerKyber');
  }

  refreshWalletList() {
    this.wallets = this.storage.getWallets(true, true);
    if (this.wallets.length > 0) {
      this.selectedWalletId = this.wallets[0].id;
    }
  }

  restartRateTracker() {
    if (this.selectedTrader === EthExchangerId.KyberNetwork) {
      this.dataTracker.stopTracker('ednRateTrackerKyber');
      this.dataTracker.startTracker('ednRateTrackerKyber', () => {
        return new Promise<any>((finalResolve, finalReject) => {
          this.getTradeRateByKyber(
            rate => {
              if (this.selectedTrader === EthExchangerId.KyberNetwork) {
                this.applyKyberRate(rate);
              }
              finalResolve(rate);
            },
            error => {
              finalReject(error);
            }
          );
        });
      });
    } else {
      this.dataTracker.stopTracker('ednRateTrackerKyber');

      this.dataTracker.stopTracker('ednRateTrackerIDEX');
      this.dataTracker.startTracker('ednRateTrackerIDEX', () => {
        return new Promise<any>((finalResolve, finalReject) => {
          this.getTradeRateByIDEX(
            rate => {
              if (this.selectedTrader === EthExchangerId.IDEX) {
                this.applyKyberRate(rate);
              }
              finalResolve(rate);
            },
            error => {
              finalReject(error);
            }
          );
        });
      });
    }
  }

  onExchangerChange(field) {
    this.logger.debug('exchanger change : ', this.selectedTrader);
    this.restartRateTracker();
    this.applyKyberRateByLocally();
    this.ednAmount = '0';
    this.ethAmount = '0';
  }

  onWalletChange(field) {
    this.logger.debug('wallet change : ', this.selectedWalletId);
  }

  sendAmountAnalytics() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'edn from eth click',
        event_label: 'edn from eth_edn from eth click'
      }
    });
  }

  onEthAmountChange() {
    this.logger.debug('on eth amount change : ', this.ethAmount);

    const safeText = BigNumberHelper.safeText(this.ethAmount, Consts.ETH_DECIMAL);
    if (safeText !== this.ethAmount) {
      this.ethAmount = safeText;
      this.ethAmountInput.value = this.ethAmount;
    }

    this.logger.debug('after eth amount change : ', this.ethAmount);

    this.applyKyberRateByLocally();
  }

  onEthAmountFocused() {
    this.lastFocusedInput = 'eth';
  }

  onEthAmountBlur() {
    this.sendAmountAnalytics();
    if (this.ethAmount.length < 1) {
      this.ethAmount = '0';
      this.applyKyberRateByLocally();
    }
  }

  onEdnAmountChange() {
    this.logger.debug('on edn amount change : ', this.ednAmount);

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);
    const destContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    const safeText = BigNumberHelper.safeText(this.ednAmount, destContractInfo.contractInfo.decimal);
    if (safeText !== this.ednAmount) {
      this.ednAmount = safeText;
      this.ednAmountInput.value = this.ednAmount;
    }

    this.logger.debug('after edn amount change : ', this.ednAmount);

    this.applyKyberRateByLocally();
  }

  onEdnAmountFocused() {
    this.lastFocusedInput = 'edn';
  }

  onEdnAmountBlur() {
    this.sendAmountAnalytics();
    if (this.ednAmount.length < 1) {
      this.ednAmount = '0';
      this.applyKyberRateByLocally();
    }
  }

  applyKyberRateByLocally() {
    if (this.selectedTrader === EthExchangerId.KyberNetwork) {
      if (this.dataTracker.getTracker('ednRateTrackerKyber').value) {
        this.applyKyberRate(this.dataTracker.getTracker('ednRateTrackerKyber').value);
      }
    } else if (this.selectedTrader === EthExchangerId.IDEX) {
      if (this.dataTracker.getTracker('ednRateTrackerIDEX').value) {
        this.applyKyberRate(this.dataTracker.getTracker('ednRateTrackerIDEX').value);
      }
    }
  }

  applyKyberRate(rate) {
    if (rate.expectedRate !== undefined) {
      //const applyRateBn = ethers.utils.bigNumberify('4524104750000000000000');

      const applyRateBn = ethers.utils.bigNumberify(rate.expectedRate);
      const srcDecimal = Consts.ETH_DECIMAL;

      const srcAmount = String(this.ethAmount);
      let srcAmountBn = null;
      try {
        this.logger.debug('parse src amount ', srcAmount);
        srcAmountBn = ethers.utils.parseUnits(srcAmount, srcDecimal);
      } catch (e) {
        this.logger.debug(e);
      }
      if (srcAmountBn === null) {
        srcAmountBn = ethers.utils.bigNumberify('0');
      }

      const walletInfo = this.storage.findWalletById(this.selectedWalletId);
      const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);
      const destContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);
      const destAmount = String(this.ednAmount);

      //const destDecimal = 20;
      const destDecimal = destContractInfo.contractInfo.decimal;

      let destAmountBn = null;
      try {
        this.logger.debug('parse destAmount : ', destAmount, destDecimal);
        destAmountBn = ethers.utils.parseUnits(destAmount, destDecimal);
      } catch (e) {
        this.logger.debug(e);
      }
      if (destAmountBn === null) {
        destAmountBn = ethers.utils.bigNumberify('0');
      }

      if (srcAmountBn === null || destAmountBn === null) {
        return;
      }

      if (this.lastFocusedInput === 'eth') {
        try {
          const rateDivResult = this.etherApi.calculateTradeResult(srcAmountBn, srcDecimal, destDecimal, applyRateBn);
          this.ednAmount = ethers.utils.formatUnits(rateDivResult, destDecimal);
        } catch (error) {
          this.logger.debug(error);
        }
      } else if (this.lastFocusedInput === 'edn') {
        try {
          const rateDivResult = this.etherApi.calculateTradeResultReversed(destAmountBn, srcDecimal, destDecimal, applyRateBn);
          this.ethAmount = ethers.utils.formatUnits(rateDivResult, srcDecimal);
        } catch (error) {
          this.logger.debug(error);
        }
      }
    }
  }

  tradeEthToEdn(walletPw?: string) {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'add click',
        event_label: 'edd_add click'
      }
    });

    if (!this.selectedWalletId) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.wallet.required'));
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    if (!this.ethAmount) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.required'), {
        category: AnalyticsCategory,
        params: {
          action: 'amount required confirm click',
          event_label: 'amount required_amoun required click'
        }
      });
      return;
    }

    let ethAmountBn = null;
    try {
      ethAmountBn = ethers.utils.parseEther(String(this.ethAmount));
    } catch (e) {
      this.logger.debug(e);
      return;
    }

    if (!ethAmountBn) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.pattern'));
      return;
    }

    if (ethAmountBn.lte(0)) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.positive'));
      return;
    }

    //confirm password
    if (!walletPw) {
      this.pinCodeConfirmCallback = this.tradeEthToEdn;
      this.events.publish(Consts.EVENT_CONFIRM_PIN_CODE);
      return;
    }

    const loading = this.feedbackUI.showRandomKeyLoading();

    if (this.selectedTrader === EthExchangerId.KyberNetwork) {
      const onTxCreate = txData => {
        loading.hide();
        this.feedbackUI.showToast(this.translate.instant('transaction.requested'));
        this.ethAmount = '0';
      };
      const onTxReceipt = txReceiptData => {};

      const onSuccess = data => {
        this.logger.debug(data);
      };

      const onError = error => {
        loading.hide();
        this.feedbackUI.showErrorDialog(error);
      };

      this.etherApi
        .kyberNetworkTradeEthToErc20Token(
          {
            walletInfo: walletInfo,
            targetErc20ContractAddres: ednContractInfo.address,
            srcEthAmount: ethAmountBn
          },
          walletPw,
          onTxCreate,
          onTxReceipt
        )
        .then(onSuccess, onError);
    } else if (this.selectedTrader === EthExchangerId.IDEX) {
      this.etherApi
        .idexTradeEthToErc20Token(
          {
            walletInfo: walletInfo,
            targetErc20ContractCode: ednContractInfo.contractInfo.symbol,
            srcEthAmount: ethAmountBn
          },
          walletPw
        )
        .then(
          result => {
            loading.hide();
            this.feedbackUI.showToast(this.translate.instant('order.success'));
            this.ethAmount = '0';
          },
          error => {
            loading.hide();
            this.feedbackUI.showErrorDialog(error);
          }
        );
    }
  }

  isInputHasNonZero(input: IonInput): boolean {
    return IonComponentUtils.isInputHasNonZero(input);
  }

  getTradeRateByKyber(onValueCatch = value => {}, onError = error => {}) {
    if (!this.selectedWalletId) {
      onError(new Error('select an wallet first'));
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    const ethAmountBn = ethers.utils.parseEther('1');
    this.logger.debug('eth amount : ' + ethAmountBn.toString());

    this.etherApi
      .kyberNetworkGetExpectedTradeRateWithWallet(
        walletInfo,
        this.etherData.contractResolver.getETH(p),
        ednContractInfo.address,
        ethAmountBn
      )
      .then(
        result => {
          onValueCatch(result);
        },
        err => {
          onError(err);
          this.logger.debug(err);
        }
      );
  }

  getTradeRateByIDEX(onValueCatch = value => {}, onError = error => {}) {
    if (!this.selectedWalletId) {
      onError(new Error('select an wallet first'));
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);

    this.etherApi.idexGetExpectedTradeRateWithWallet(walletInfo, Consts.ETH_CODE, env.config.ednCoinKey).then(
      result => {
        onValueCatch(result);
      },
      err => {
        onError(err);
        this.logger.debug(err);
      }
    );
  }
}
