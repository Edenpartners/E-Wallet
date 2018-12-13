import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Input } from '@ionic/angular';
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

@Component({
  selector: 'app-ew-sendto',
  templateUrl: './ew-sendto.page.html',
  styleUrls: ['./ew-sendto.page.scss']
})
export class EwSendtoPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

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
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
      });
    });
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  setEvents() {}

  transferERC20Token(toAddressInput: Input, sendingAmountInput: Input) {
    const toAddress = toAddressInput.value;
    const amount = sendingAmountInput.value;

    if (!toAddress) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.address.required')
      );
      return;
    }
    if (!amount) {
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
        amount,
        ednContractInfo.contractInfo.decimal
      );
    } catch (e) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
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

    const loadingHandler: LoadingHandler = this.feedbackUI.createLoading();
    const onTransactionCreate = tx => {
      /** transaction info */
      loadingHandler.hide();
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
          toAddress: toAddress,
          srcAmount: adjustedAmount
        },
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }
}
