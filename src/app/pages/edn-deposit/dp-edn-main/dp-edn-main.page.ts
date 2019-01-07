import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { Keyboard } from '@ionic-native/keyboard/ngx';

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
import { KyberNetworkService } from '../../../providers/kybernetwork.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

import { IonInput, Platform } from '@ionic/angular';

import {
  DataTrackerService,
  ValueTracker
} from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { env } from '../../../../environments/environment';
import { Consts } from '../../../../environments/constants';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';

import { IonComponentUtils } from '../../../utils/ion-component-utils';

@Component({
  selector: 'app-dp-edn-main',
  templateUrl: './dp-edn-main.page.html',
  styleUrls: ['./dp-edn-main.page.scss']
})
export class DpEdnMainPage implements OnInit, OnDestroy {
  selectedTrader = 'Kyber Networks';
  selectedWalletId: string = null;
  wallets: Array<WalletTypes.EthWalletInfo> = [];
  ednFromEthEstimatedText = '-';
  ednFromEthEstimated: BigNumber;
  ethAmount = 0;

  pinCodeConfirmCallback = null;

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private rs: RouterService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private keyboard: Keyboard
  ) {}

  ngOnInit() {
    this.refreshWalletList();
  }
  ngOnDestroy() {}

  ionViewWillEnter() {
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

  ionViewDidLeave() {
    this.subscriptionPack.clear();
    this.pinCodeConfirmCallback = null;
    this.events.unsubscribe(Consts.EVENT_PIN_CODE_RESULT);

    this.dataTracker.stopTracker('ednRateTracker');
  }

  refreshWalletList() {
    this.wallets = this.storage.getWallets(true, true);
    if (this.wallets.length > 0) {
      this.selectedWalletId = this.wallets[0].id;
    }
  }

  restartRateTracker() {
    this.dataTracker.stopTracker('ednRateTracker');
    this.dataTracker.startTracker('ednRateTracker', () => {
      return new Promise<any>((finalResolve, finalReject) => {
        this.getRate(
          rate => {
            finalResolve(rate);
          },
          error => {
            finalReject(error);
          }
        );
      });
    });
  }

  onWalletChange(field) {
    this.logger.debug(field);
  }

  getRate(onValueCatch = value => {}, onError = error => {}) {
    if (!this.selectedWalletId) {
      this.logger.debug('select an wallet first');
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

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
          this.displayRate(result);
        },
        err => {
          onError(err);
          this.logger.debug(err);
        }
      );
  }

  getRateByLocally() {
    if (this.dataTracker.getTracker('ednRateTracker').value) {
      this.displayRate(this.dataTracker.getTracker('ednRateTracker').value);
    }
  }

  displayRate(rate) {
    if (rate.expectedRate !== undefined) {
      const ethAmountBn = ethers.utils.parseEther(String(this.ethAmount));

      // wei => rated wei ( calulcated by source value ( wei ))
      this.ednFromEthEstimated = ethers.utils.bigNumberify(rate.expectedRate);

      const rateResult = ethAmountBn.mul(this.ednFromEthEstimated);

      //convert to text
      const rateDivResult = rateResult.div(
        ethers.utils.bigNumberify(10).pow(Consts.ETH_DECIMAL)
      );

      this.logger.debug(rateResult.toString());
      this.ednFromEthEstimatedText = ethers.utils.formatEther(rateDivResult);
    }
  }

  tradeEthToEdn(walletPw?: string) {
    if (!this.selectedWalletId) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.wallet.required')
      );
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    if (!this.ethAmount) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.required')
      );
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
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.pattern')
      );
      return;
    }

    if (ethAmountBn.lte(0)) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.amount.positive')
      );
      return;
    }

    if (!walletPw) {
      this.pinCodeConfirmCallback = this.tradeEthToEdn;
      this.events.publish(Consts.EVENT_CONFIRM_PIN_CODE);
      return;
    }

    const loading = this.feedbackUI.showRandomKeyLoading();

    const onTxCreate = txData => {
      loading.hide();
      this.feedbackUI.showToast(
        this.translate.instant('transaction.requested')
      );
      this.ethAmount = 0;
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
  }

  isInputHasNonZero(input: IonInput): boolean {
    return IonComponentUtils.isInputHasNonZero(input);
  }
}
