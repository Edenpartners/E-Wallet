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
  ednBalanceDisplay: string;

  @ViewChild('aliasInput') aliasInput: IonInput;

  @ViewChild('multilineLabel') multilineLabel;
  @ViewChild('multilineLayout') multilineLayout: MultilineLayoutDirective;

  keyboardVisible = false;

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
  }

  setWalletEvents() {
    const p: EthProviders.Base = this.eths.getProvider(this.wallet.info.provider);

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(this.wallet, ednContractInfo);

    const applyEdnValue = (value: { balance: BigNumber; adjustedBalance: BigNumber }) => {
      this.ednBalance = value.balance;
      this.ednBalanceAdjusted = value.adjustedBalance;

      this.ednBalanceDisplay = BigNumberHelper.removeZeroPrecision(this.ednBalanceAdjusted.toString());
      this.multilineLayout.updateLayout();
    };

    this.subscriptionPack.addSubscription(() => {
      return ednTracker.trackObserver.subscribe(applyEdnValue);
    }, this.wallet);

    if (ednTracker.value) {
      applyEdnValue(ednTracker.value);
    }
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
