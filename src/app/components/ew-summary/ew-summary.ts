import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { Keyboard } from '@ionic-native/keyboard/ngx';

import { EthService, EthProviders } from '../../providers/ether.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { BigNumber } from 'ethers/utils';
import { EtherDataService } from '../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { IonInput, IonLabel } from '@ionic/angular';
import { EtherApiService } from '../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from '../../providers/appStorage.service';

import { DataTrackerService, ValueTracker } from '../../providers/dataTracker.service';

import { SubscriptionPack } from '../../utils/listutil';
import { env } from '../../../environments/environment';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Events } from '@ionic/angular';

import { Consts } from '../../../environments/constants';
import { ContentPopupPage } from '../../pages/common/content-popup/content-popup.page';
import { TextUtils } from 'src/app/utils/textutils';

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
  originFontSize: string = null;

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

      this.ednBalanceDisplay = this.ednBalanceAdjusted.toString();
      //this.ednBalanceDisplay = this.ednBalanceDisplay + this.ednBalanceDisplay + this.ednBalanceDisplay + this.ednBalanceDisplay;

      const labelEl: HTMLElement = this.multilineLabel.el;
      const cStyle = getComputedStyle(labelEl);

      if (this.originFontSize === null) {
        this.originFontSize = cStyle.fontSize;
      }
      const labelWidth: number = labelEl.getBoundingClientRect().width;
      const measured = TextUtils.measureTextWithEl(
        this.ednBalanceDisplay,
        { fontFamily: cStyle.fontFamily, fontSize: this.originFontSize, fontWeight: cStyle.fontWeight, lineHeight: cStyle.lineHeight },
        labelWidth
      );

      let fontSize = this.originFontSize;
      if (measured.lineCount > 1) {
        fontSize = '16px';
      } else {
        fontSize = this.originFontSize;
      }
      labelEl.style.fontSize = fontSize;

      const lastMeasured = TextUtils.measureTextWithEl(
        this.ednBalanceDisplay,
        {
          fontFamily: cStyle.fontFamily,
          fontSize: fontSize,
          fontWeight: cStyle.fontWeight,
          lineHeight: cStyle.lineHeight
        },
        labelWidth
      );

      if (lastMeasured.lineCount <= 1) {
        labelEl.style.textAlign = 'right';
      } else {
        labelEl.style.textAlign = 'left';
      }
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
