import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval, Subscription } from 'rxjs';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { IonInput, Platform } from '@ionic/angular';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { DataTrackerService } from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { env } from '../../../../environments/environment';

import { FeedbackUIService, LoadingHandler } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Consts } from '../../../../environments/constants';
import { Events } from '@ionic/angular';

import { Keyboard } from '@ionic-native/keyboard/ngx';
import { EwSummary } from '../../../components/ew-summary/ew-summary';

import { IonComponentUtils } from '../../../utils/ion-component-utils';

import { BigNumberHelper } from '../../../utils/bigNumberHelper';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
const AnalyticsCategory = 'edn transaction1';

@Component({
  selector: 'app-ew-sendto',
  templateUrl: './ew-sendto.page.html',
  styleUrls: ['./ew-sendto.page.scss']
})
export class EwSendtoPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  toAddress = '';
  amount = '0';

  pinCodeConfirmCallback = null;

  viewActivated = false;

  @ViewChild('summary') summary: EwSummary;

  @ViewChild('amountInput') amountInput: IonInput;

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
    private keyboard: Keyboard,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.viewActivated = true;
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']); // (+) converts string 'id' to a number
          this.wallet = this.storage.findWalletById(this.walletId);
          this.summary.startGetInfo(this.walletId);
        } catch (e) {
          this.logger.debug(e);
        }
      });
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
    this.summary.stopGetInfo();
  }

  ionViewDidLeave() {
    this.pinCodeConfirmCallback = null;
    this.events.unsubscribe(Consts.EVENT_PIN_CODE_RESULT);
    this.subscriptionPack.clear();
  }

  setEvents() {}

  onAmountInputChange() {
    const walletInfo = this.storage.findWalletById(this.walletId);
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);
    const destContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    const safeText = BigNumberHelper.safeText(this.amount, destContractInfo.contractInfo.decimal);
    if (safeText !== this.amount) {
      this.amount = safeText;
      this.amountInput.value = this.amount;
    }
  }

  onSendBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'send two click',
        event_label: 'send two_send two click'
      }
    });

    this.transferERC20Token();
  }

  transferERC20Token(walletPw?: string) {
    if (!this.toAddress.trim()) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.wallet-address.required'));

      return;
    }

    if (this.toAddress.trim().toLowerCase() === this.wallet.address.toLowerCase()) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.wallet-address.nonEqual'));
      return;
    }

    if (!this.amount) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.required'));
      return;
    }

    const p: EthProviders.Base = this.eths.getProvider(this.wallet.info.provider);
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(String(this.amount), ednContractInfo.contractInfo.decimal);
    } catch (e) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.pattern'));
      return;
    }

    if (adjustedAmount.lte(0)) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.positive'));
      return;
    }

    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(this.wallet, ednContractInfo);

    if (ednTracker.value) {
      const ednBalance = ednTracker.value.balance;
      const ednAdjustedBalance = ednTracker.value.adjustedBalance;
    }

    if (!walletPw) {
      this.pinCodeConfirmCallback = this.transferERC20Token;
      this.events.publish(Consts.EVENT_CONFIRM_PIN_CODE);
      return;
    }

    const loadingHandler: LoadingHandler = this.feedbackUI.showRandomKeyLoading();
    const onTransactionCreate = tx => {
      /** transaction info */
      loadingHandler.hide();
      this.feedbackUI.showToast(this.translate.instant('transaction.requested'));
      this.amount = 0;
    };

    const onTransactionReceipt = txReceipt => {};

    const onSuccess = data => {};

    const onError = error => {
      loadingHandler.hide();
      this.feedbackUI.showErrorDialog(error);
    };

    this.etherApi
      .transferERC20Token(
        {
          walletInfo: this.wallet,
          ctInfo: ednContractInfo,
          toAddress: this.toAddress.trim(),
          srcAmount: adjustedAmount
        },
        walletPw,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  isInputHasValue(input: IonInput): boolean {
    return IonComponentUtils.isInputHasValue(input);
  }

  isInputHasNonZero(input: IonInput): boolean {
    return IonComponentUtils.isInputHasNonZero(input);
  }
}
