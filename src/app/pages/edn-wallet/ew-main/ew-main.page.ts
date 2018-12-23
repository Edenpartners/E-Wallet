import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { RouterService } from '../../../providers/router.service';

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
import { IonInput } from '@ionic/angular';
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
import { env } from '../../../../environments/environment';
import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Events } from '@ionic/angular';

@Component({
  selector: 'app-ew-main',
  templateUrl: './ew-main.page.html',
  styleUrls: ['./ew-main.page.scss']
})
export class EwMainPage implements OnInit, OnDestroy {
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  aliasEditing = false;
  editingAlias = '';

  subscriptionPack: SubscriptionPack = new SubscriptionPack();
  ednBalance: BigNumber;
  ednBalanceAdjusted: BigNumber;

  @ViewChild('aliasInput') aliasInput: IonInput;

  constructor(
    private element: ElementRef,
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private etherData: EtherDataService,
    private eths: EthService,
    private cbService: ClipboardService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events
  ) {}

  ngOnInit() {
    this.events.subscribe('get.ew-main.height', () => {
      const firstRect = this.element.nativeElement.getBoundingClientRect();
      this.logger.debug('send first rect');
      if (firstRect) {
        this.events.publish('set.ew-main.height', firstRect.height + 'px');
      }
    });
  }

  ngOnDestroy() {
    this.events.unsubscribe('get.ew-main.height');
  }

  ionViewWillEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']); // (+) converts string 'id' to a number
          this.wallet = this.storage.findWalletById(this.walletId);
          this.logger.debug('a wallet ' + this.wallet.id);
          this.setWalletEvents();
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ionViewDidLeave() {
    this.subscriptionPack.clear();
  }

  setWalletEvents() {
    const p: EthProviders.Base = this.eths.getProvider(
      this.wallet.info.provider
    );

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(
      this.wallet,
      ednContractInfo
    );

    const applyEdnValue = (value: {
      balance: BigNumber;
      adjustedBalance: BigNumber;
    }) => {
      this.ednBalance = value.balance;
      this.ednBalanceAdjusted = value.adjustedBalance;
    };
    this.subscriptionPack.addSubscription(() => {
      return ednTracker.trackObserver.subscribe(applyEdnValue);
    }, this.wallet);

    if (ednTracker.value) {
      applyEdnValue(ednTracker.value);
    }
  }

  onBackBtnClick() {
    this.rs.goBack();
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
    this.cbService.copyFromContent(walletAddress);
    this.feedbackUI.showToast(this.translate.instant('wallet.address.copied'));
  }

  handleAliasEditing() {
    if (!this.editingAlias) {
      return;
    }

    this.wallet.profile.alias = this.editingAlias;
    this.storage.syncDataToLocalStorage(this.wallet);
    this.aliasEditing = false;
  }

  isTracsactionTab() {
    if (this.rs.getRouter().url.indexOf('sub:list') >= 0) {
      return true;
    } else {
      return false;
    }
  }
}
