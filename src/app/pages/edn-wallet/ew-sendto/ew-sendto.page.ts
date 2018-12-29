import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
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
import { UUID } from 'angular2-uuid';
import { Observable, interval, Subscription } from 'rxjs';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { IonInput, Platform } from '@ionic/angular';
import { KyberNetworkService } from '../../../providers/kybernetwork.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

import {
  DataTrackerService,
  ValueTracker
} from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { DecimalPipe } from '@angular/common';
import { env } from '../../../../environments/environment';

import {
  FeedbackUIService,
  LoadingHandler
} from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Consts } from '../../../../environments/constants';
import { Events } from '@ionic/angular';

import { Keyboard } from '@ionic-native/keyboard/ngx';

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
  amount = 0;

  pinCodeConfirmCallback = null;

  @ViewChild('background') background: ElementRef;

  keyboardVisible = false;

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
    private keyboard: Keyboard
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
      });
    });

    this.events.subscribe(Consts.EVENT_PIN_CODE_RESULT, walletPw => {
      if (this.pinCodeConfirmCallback && walletPw) {
        this.pinCodeConfirmCallback(walletPw);
      }
      this.pinCodeConfirmCallback = null;
    });

    this.events.subscribe('set.ew-main.height', height => {
      this.background.nativeElement.style.height = height;
    });
    this.events.publish('get.ew-main.height');

    this.subscriptionPack.addSubscription(() => {
      return this.keyboard.onKeyboardWillShow().subscribe((val: any) => {
        this.keyboardVisible = true;
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return this.keyboard.onKeyboardWillHide().subscribe((val: any) => {
        this.keyboardVisible = false;
      });
    });
  }

  ionViewDidLeave() {
    this.events.unsubscribe('set.ew-main.height');

    this.pinCodeConfirmCallback = null;
    this.events.unsubscribe(Consts.EVENT_PIN_CODE_RESULT);
    this.subscriptionPack.clear();
    this.keyboardVisible = false;
  }

  setEvents() {}

  transferERC20Token(walletPw?: string) {
    if (!this.toAddress.trim()) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.address.required')
      );
      return;
    }
    if (!this.amount) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.required')
      );
      return;
    }

    const p: EthProviders.Base = this.eths.getProvider(
      this.wallet.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(
        String(this.amount),
        ednContractInfo.contractInfo.decimal
      );
    } catch (e) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
      );
      return;
    }

    if (adjustedAmount.lte(0)) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.positive')
      );
      return;
    }

    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(
      this.wallet,
      ednContractInfo
    );

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
      this.feedbackUI.showToast(
        this.translate.instant('transaction.requested')
      );
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
}
