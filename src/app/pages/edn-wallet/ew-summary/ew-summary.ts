import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgModule } from '@angular/core';

import { Keyboard } from '@ionic-native/keyboard/ngx';

import { EthService, EthProviders } from 'src/app/providers/ether.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { BigNumber } from 'ethers/utils';
import { EtherDataService } from 'src/app/providers/etherData.service';
import { WalletService, WalletTypes } from 'src/app/providers/wallet.service';
import { IonInput, IonLabel } from '@ionic/angular';
import { EtherApiService } from 'src/app/providers/etherApi.service';
import { EdnRemoteApiService } from 'src/app/providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from 'src/app/providers/appStorage.service';

import { DataTrackerService, ValueTracker } from 'src/app/providers/dataTracker.service';

import { SubscriptionPack } from 'src/app/utils/listutil';
import { env } from 'src/environments/environment';
import { FeedbackUIService } from 'src/app/providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Events } from '@ionic/angular';

import { Consts } from 'src/environments/constants';
import { ContentPopupPage } from 'src/app/pages/common/content-popup/content-popup.page';
import { TextUtils } from 'src/app/utils/textutils';
import { MultilineLayoutDirective } from 'src/app/directives/multiline-layout';
import { SharedPageModule } from 'src/app/modules/shared.page.module';
import { UUID } from 'angular2-uuid';
import { BigNumberHelper } from 'src/app/utils/bigNumberHelper';
import { ethers } from 'ethers';

const EthEdnTrackerKey = 'EthEdn';
const UsdcEthTrackerKey = 'UsdcEth';

@Component({
  selector: 'ew-summary',
  templateUrl: './ew-summary.html',
  styleUrls: ['./ew-summary.scss']
})
export class EwSummary {
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  aliasEditing = false;
  editingAlias = '';

  subscriptionPack: SubscriptionPack = new SubscriptionPack();
  ednBalance: BigNumber;
  ednBalanceAdjusted: BigNumber;
  ednBalanceDisplay: string = null;

  usdBalance: BigNumber;
  usdBalanceDisplay: string = null;

  @ViewChild('aliasInput') aliasInput: IonInput;

  @ViewChild('multilineLabelEdn') multilineLabelEdn;
  @ViewChild('multilineLayoutEdn') multilineLayoutEdn: MultilineLayoutDirective;

  @ViewChild('multilineLabelUsd') multilineLabelUsd;
  @ViewChild('multilineLayoutUsd') multilineLayoutUsd: MultilineLayoutDirective;

  keyboardVisible = false;
  tradeRateETH_EDN: any = null;
  tradeRateUSDC_ETH: any = null;

  constructor(
    private element: ElementRef,
    private logger: NGXLogger,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private etherData: EtherDataService,
    private eths: EthService,
    private cbService: ClipboardService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private keyboard: Keyboard
  ) {}

  startGetInfo(walletId: string) {
    try {
      this.walletId = walletId;
      this.wallet = this.storage.findWalletById(this.walletId);
      this.logger.debug('a wallet ' + this.wallet.id);
      this.setWalletEvents();
    } catch (e) {
      this.logger.debug(e);
    }
  }

  stopGetInfo() {
    this.subscriptionPack.clear();
    this.dataTracker.stopTracker(EthEdnTrackerKey, false);
    this.dataTracker.stopTracker(UsdcEthTrackerKey, false);
  }

  setWalletEvents() {
    const p: EthProviders.Base = this.eths.getProvider(this.wallet.info.provider);

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);
    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(this.wallet, ednContractInfo);

    const applyEdnValue = (value: { balance: BigNumber; adjustedBalance: BigNumber }) => {
      this.ednBalance = value.balance;
      this.ednBalanceAdjusted = value.adjustedBalance;

      this.ednBalanceDisplay = BigNumberHelper.removeZeroPrecision(this.ednBalanceAdjusted.toString());
      this.multilineLayoutEdn.updateLayout();

      if (this.tradeRateETH_EDN !== null) {
        const tradeRateEthEdnBn = ethers.utils.bigNumberify(this.tradeRateETH_EDN.expectedRate);
        //convert EDN to ETH
        const ednToEthBn = this.etherApi.calculateTradeResultReversed(
          this.ednBalance,
          Consts.ETH_DECIMAL,
          ednContractInfo.contractInfo.decimal,
          tradeRateEthEdnBn
        );

        const ednToEthBnText = ethers.utils.formatUnits(ednToEthBn, Consts.ETH_DECIMAL);
        const ednToEthBnTextDisplay = BigNumberHelper.removeZeroPrecision(ednToEthBnText);

        this.logger.debug('Converted ETH for EDN', ednToEthBnTextDisplay);

        if (this.tradeRateUSDC_ETH !== null) {
          const tradeRateUsdcEthBn = ethers.utils.bigNumberify(this.tradeRateUSDC_ETH.expectedRate);
          const ethToUsdcRateResultBn = this.etherApi.calculateTradeResultReversed(
            ednToEthBn,
            Consts.USDC_DECIMAL,
            Consts.ETH_DECIMAL,
            tradeRateUsdcEthBn
          );
          const ethToUsdcBnText = ethers.utils.formatUnits(ethToUsdcRateResultBn, Consts.USDC_DECIMAL);
          const ethToUsdcBnTextDisplay = BigNumberHelper.removeZeroPrecision(ethToUsdcBnText);
          this.logger.debug('Converted USD for ETH', ethToUsdcBnTextDisplay);

          this.usdBalance = ethToUsdcRateResultBn;
          this.usdBalanceDisplay = ethToUsdcBnTextDisplay;
        }
      }
    };

    this.subscriptionPack.addSubscription(() => {
      return ednTracker.trackObserver.subscribe(applyEdnValue);
    }, this.wallet.id);

    this.setTradeRateTrackers(ednContractInfo);

    if (ednTracker.value) {
      applyEdnValue(ednTracker.value);
    }
  }

  setTradeRateTrackers(ednContractInfo: WalletTypes.ContractInfo) {
    const tradeRateEthEdnTracker = this.dataTracker.startTracker(EthEdnTrackerKey, () => {
      return new Promise<any>((finalResolve, finalReject) => {
        this.etherApi.idexGetExpectedTradeRate(Consts.ETH_CODE, ednContractInfo.contractInfo.symbol).then(
          rateEthEdn => {
            finalResolve(rateEthEdn);
          },
          (error: any) => {
            finalReject(error);
          }
        );
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return tradeRateEthEdnTracker.trackObserver.subscribe((rateEthEdn: any) => {
        this.tradeRateETH_EDN = rateEthEdn;
      });
    });

    if (tradeRateEthEdnTracker.value) {
      this.tradeRateETH_EDN = tradeRateEthEdnTracker.value;
    }

    const tradeRateUsdcEthTracker = this.dataTracker.startTracker(UsdcEthTrackerKey, () => {
      return new Promise<any>((finalResolve, finalReject) => {
        this.etherApi.idexGetExpectedTradeRate(Consts.USDC_SYMBOL, Consts.ETH_CODE).then(
          rateUsdcEth => {
            finalResolve(rateUsdcEth);
          },
          (error: any) => {
            finalReject(error);
          }
        );
      });
    });

    if (tradeRateUsdcEthTracker.value) {
      this.tradeRateUSDC_ETH = tradeRateUsdcEthTracker.value;
    }

    this.subscriptionPack.addSubscription(() => {
      return tradeRateUsdcEthTracker.trackObserver.subscribe((rateUsdcEth: any) => {
        this.tradeRateUSDC_ETH = rateUsdcEth;
      });
    });
  }

  onWalletAliasClick() {
    this.logger.debug('edit wallet alias : ' + this.wallet.profile.alias);
    this.editingAlias = this.wallet.profile.alias;
    this.aliasEditing = true;
    setTimeout(() => {
      this.aliasInput.setFocus();
    }, 100);
  }

  onWalletAddressClick(walletAddress) {
    this.events.publish(Consts.EVENT_SHOW_MODAL, ContentPopupPage, { content: walletAddress });
  }

  handleAliasEditing() {
    if (!this.editingAlias) {
      return;
    }

    this.wallet.profile.alias = this.editingAlias;
    this.storage.syncDataToLocalStorage(this.wallet);
    this.aliasEditing = false;
  }
}

@NgModule({
  imports: [SharedPageModule],
  declarations: [EwSummary],
  exports: [EwSummary]
})
export class EwSummaryModule {}
