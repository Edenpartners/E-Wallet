import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
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
import { NGXLogger } from 'ngx-logger';

import { env } from '../../../../environments/environment';
import {
  FeedbackUIService,
  LoadingHandler
} from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Consts } from '../../../../environments/constants';

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
  wallets: Array<WalletTypes.WalletInfo> = [];
  tednWallets: Array<AppStorageTypes.TednWalletInfo> = [];

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  mode: string = Mode.deposit;

  selectedEthWalletId: string = null;
  selectedTednWalletId: string = null;

  tradeAmount = 0;

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
      return this.aRoute.queryParamMap.subscribe(query => {
        try {
          if (query.get('mode')) {
            this.mode = query.get('mode');
            this.logger.debug('mode : ', this.mode);
          }
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });

    this.refreshList();
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  refreshList() {
    this.wallets = this.storage.getWallets();
    if (this.wallets.length > 0) {
      this.selectedEthWalletId = this.wallets[0].id;
    }

    this.tednWallets = this.storage.getTednWallets();
    if (this.tednWallets.length > 0) {
      this.selectedTednWalletId = this.tednWallets[0].id;
    }
  }

  depositTEDN() {
    if (!this.selectedEthWalletId) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.wallet.required')
      );
      return;
    }

    if (!this.selectedTednWalletId) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.tednWallet.required')
      );
      return;
    }

    if (!this.storage.coinHDAddress) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('error.network.connection')
      );
      return;
    }

    if (!this.tradeAmount) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.required')
      );
      return;
    }

    const walletInfo: WalletTypes.WalletInfo = this.storage.findWalletById(
      this.selectedEthWalletId
    );
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(
        String(this.tradeAmount),
        ednContractInfo.contractInfo.decimal
      );
    } catch (e) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
      );
      return;
    }

    const loadingHandler: LoadingHandler = this.feedbackUI.createLoading();

    this.logger.debug('========= DEPOSIT ========== ');
    this.logger.debug(ednContractInfo);
    this.logger.debug(this.tradeAmount);
    const onTransactionCreate = tx => {
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
          walletInfo: walletInfo,
          ctInfo: ednContractInfo,
          toAddress: this.storage.coinHDAddress,
          srcAmount: adjustedAmount,
          customLogData: { filter: 'tedn.deposit', postedToEdnServer: false }
        },
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  tradeEdnToTedn() {
    this.depositTEDN();
  }
  tradeTednToEdn() {
    this.withdrawTEDN();
  }

  withdrawTEDN() {
    if (!this.selectedEthWalletId) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.wallet.required')
      );
      return;
    }

    if (!this.selectedTednWalletId) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.tednWallet.required')
      );
      return;
    }

    if (!this.tradeAmount) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.required')
      );
      return;
    }

    const walletInfo: WalletTypes.WalletInfo = this.storage.findWalletById(
      this.selectedEthWalletId
    );
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(
        String(this.tradeAmount),
        Consts.TEDN_DECIMAL
      );
    } catch (e) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
      );
      return;
    }

    const loadingHandler: LoadingHandler = this.feedbackUI.createLoading();

    this.logger.debug(
      adjustedAmount.toString() + '/' + adjustedAmount.toHexString()
    );

    this.ednApi
      .withdrawFromTEDN(walletInfo.address, adjustedAmount.toString())
      .then(
        result => {},
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        loadingHandler.hide();
      });
  }
}
