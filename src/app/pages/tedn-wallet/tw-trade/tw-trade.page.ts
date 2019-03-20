import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorageService } from 'ngx-store';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { DataTrackerService, ValueTracker } from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { NGXLogger } from 'ngx-logger';

import { env } from '../../../../environments/environment';
import { FeedbackUIService, LoadingHandler } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Consts } from '../../../../environments/constants';

import { Events, IonInput } from '@ionic/angular';

import { IonComponentUtils } from '../../../utils/ion-component-utils';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { BigNumberHelper } from '../../../utils/bigNumberHelper';
import { TextUtils } from 'src/app/utils/textutils';
import { MultilineLayoutDirective } from 'src/app/directives/multiline-layout';

enum Mode {
  deposit = 'deposit',
  withdraw = 'withdraw'
}

@Component({
  selector: 'app-tw-trade',
  templateUrl: './tw-trade.page.html',
  styleUrls: ['./tw-trade.page.scss']
})
export class TwTradePage implements OnInit, OnDestroy {
  walletId: string;
  wallet: AppStorageTypes.TednWalletInfo;
  tednBalance = null;
  tednBalanceFormatted = null;

  wallets: Array<WalletTypes.WalletInfo> = [];
  tednWallets: Array<AppStorageTypes.TednWalletInfo> = [];

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  mode: string = Mode.deposit;

  selectedEthWalletId: string = null;
  selectedTednWalletId: string = null;

  tradeAmount = '0';
  pinCodeConfirmCallback = null;

  @ViewChild('tradeAmountInput') tradeAmountInput: IonInput;

  @ViewChild('multilineLabel') multilineLabel;
  @ViewChild('multilineLayout') multilineLayout: MultilineLayoutDirective;

  constructor(
    private aRoute: ActivatedRoute,
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
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {}

  ionViewWillEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']);
          this.wallet = this.storage.findTednWalletById(this.walletId);

          if (this.wallet) {
            const tednTracker = this.dataTracker.startTEDNBalanceTracker(this.walletId);

            this.subscriptionPack.addSubscription(() => {
              return tednTracker.trackObserver.subscribe(balance => {
                this.tednBalance = balance;
                this.tednBalanceFormatted = BigNumberHelper.removeZeroPrecision(ethers.utils.formatUnits(balance, Consts.TEDN_DECIMAL));
                this.multilineLayout.updateLayout();
              });
            });
          }
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.queryParamMap.subscribe(query => {
        try {
          this.logger.debug('query : ', query);
          this.logger.debug(this.rs.getRouter().url);
          if (this.rs.getRouter().url.indexOf('tedn-deposit') >= 0) {
            this.mode = Mode.deposit;
          } else if (this.rs.getRouter().url.indexOf('tedn-withdraw') >= 0) {
            this.mode = Mode.withdraw;
          }
          this.logger.debug('mode : ' + this.mode);
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });

    this.events.subscribe(Consts.EVENT_PIN_CODE_RESULT, pinCode => {
      if (this.pinCodeConfirmCallback && pinCode) {
        this.pinCodeConfirmCallback(pinCode);
      }
      this.pinCodeConfirmCallback = null;
    });

    this.refreshList();
  }

  ionViewDidEnter() {}

  ionViewWillLeave() {
    this.logger.debug('destroy tw-trade');
    this.subscriptionPack.clear();
  }

  ionViewDidLeave() {
    this.pinCodeConfirmCallback = null;
    this.events.unsubscribe(Consts.EVENT_PIN_CODE_RESULT);
  }

  refreshList() {
    this.wallets = this.storage.getWallets(true, true);
    if (this.wallets.length > 0) {
      this.selectedEthWalletId = this.wallets[0].id;
    }

    this.tednWallets = this.storage.getTednWallets();
    if (this.tednWallets.length > 0) {
      this.selectedTednWalletId = this.tednWallets[0].id;
    }
  }

  onTradeAmountChange() {
    const safeText = BigNumberHelper.safeText(this.tradeAmount, Consts.TEDN_DECIMAL);
    if (safeText !== this.tradeAmount) {
      this.tradeAmount = safeText;
      this.tradeAmountInput.value = this.tradeAmount;
    }
  }

  getWalletRequiredEvent(): AnalyticsEvent {
    return {
      category: this.mode,
      params: {
        action: 'wallet required confirm click',
        event_label: 'wallet required_wallet required click'
      }
    };
  }

  getAmountRequiredEvent(): AnalyticsEvent {
    return {
      category: this.mode,
      params: {
        action: 'amount required confirm click',
        event_label: 'amount required_amount required click'
      }
    };
  }

  validateForTrade(amountDecimal: number): BigNumber {
    if (!this.selectedEthWalletId) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.wallet.required'), this.getWalletRequiredEvent());
      return null;
    }

    if (!this.selectedTednWalletId) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.tednWallet.required'), this.getWalletRequiredEvent());
      return null;
    }

    if (!this.storage.coinHDAddress) {
      this.feedbackUI.showErrorDialog(this.translate.instant('error.network.connection'));
      return null;
    }

    if (!this.tradeAmount) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.required'), this.getAmountRequiredEvent());
      return null;
    }
    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(String(this.tradeAmount), amountDecimal);
    } catch (e) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.pattern'), this.getAmountRequiredEvent());
      return null;
    }

    if (adjustedAmount.lte(0)) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.positive'), this.getAmountRequiredEvent());
      return null;
    }

    return adjustedAmount;
  }

  depositTEDN(pinCode?: string) {
    const walletInfo: WalletTypes.WalletInfo = this.storage.findWalletById(this.selectedEthWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    // convert to
    const adjustedAmount: BigNumber = this.validateForTrade(ednContractInfo.contractInfo.decimal);
    if (adjustedAmount === null) {
      return;
    }

    if (!pinCode) {
      this.pinCodeConfirmCallback = this.depositTEDN;
      this.events.publish(Consts.EVENT_CONFIRM_PIN_CODE);
      return;
    }

    const loadingHandler: LoadingHandler = this.feedbackUI.showRandomKeyLoading();

    this.logger.debug('========= DEPOSIT ========== ');
    this.logger.debug(ednContractInfo);
    this.logger.debug(this.tradeAmount);
    const onTransactionCreate = tx => {
      loadingHandler.hide();
      this.feedbackUI.showToast(this.translate.instant('transaction.requested'));
      this.tradeAmount = '0';
    };
    const onTransactionReceipt = txReceipt => {};

    const onSuccess = data => {};

    const onError = error => {
      loadingHandler.hide();
      this.feedbackUI.showErrorDialog(error, {
        category: this.mode,
        params: {
          action: 'deposit error confirm click',
          event_label: 'deposit error_deposit error click'
        }
      });
    };

    this.etherApi
      .transferERC20Token(
        {
          walletInfo: walletInfo,
          ctInfo: ednContractInfo,
          toAddress: this.storage.coinHDAddress,
          srcAmount: adjustedAmount,
          customLogData: 'tedn.deposit.unposted'
        },
        pinCode,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  tradeEdnToTedn() {
    this.analytics.logEvent({
      category: this.mode,
      params: {
        action: 'deposit click',
        event_label: 'deposit_deposit click'
      }
    });

    this.depositTEDN();
  }

  tradeTednToEdn() {
    this.analytics.logEvent({
      category: this.mode,
      params: {
        action: 'withdraw click',
        event_label: 'withdraw_withdraw click'
      }
    });

    this.withdrawTEDN();
  }

  withdrawTEDN(pinCode?: string) {
    const walletInfo: WalletTypes.WalletInfo = this.storage.findWalletById(this.selectedEthWalletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);

    // convert to
    const adjustedAmount: BigNumber = this.validateForTrade(Consts.TEDN_DECIMAL);
    if (adjustedAmount === null) {
      return;
    }

    if (!pinCode) {
      this.pinCodeConfirmCallback = this.withdrawTEDN;
      this.events.publish(Consts.EVENT_CONFIRM_PIN_CODE);
      return;
    }

    const loadingHandler: LoadingHandler = this.feedbackUI.showRandomKeyLoading();

    this.logger.debug(adjustedAmount.toString() + '/' + adjustedAmount.toHexString());

    this.ednApi
      .withdrawFromTEDN(walletInfo.address, adjustedAmount.toString())
      .then(
        result => {
          this.feedbackUI.showToast(this.translate.instant('transaction.requested'));
          this.tradeAmount = '0';
        },
        error => {
          this.feedbackUI.showErrorDialog(error, {
            category: this.mode,
            params: {
              action: 'withdraw error confirm click',
              event_label: 'withdraw error_withdraw error click'
            }
          });
        }
      )
      .finally(() => {
        loadingHandler.hide();
      });
  }

  isInputHasNonZero(input: IonInput): boolean {
    return IonComponentUtils.isInputHasNonZero(input);
  }
}
