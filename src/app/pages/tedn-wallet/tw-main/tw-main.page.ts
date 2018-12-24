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

import { Events } from '@ionic/angular';

@Component({
  selector: 'app-tw-main',
  templateUrl: './tw-main.page.html',
  styleUrls: ['./tw-main.page.scss']
})
export class TwMainPage implements OnInit, OnDestroy {
  walletId: string;

  aliasEditing = false;
  editingAlias = '';

  subscriptionPack: SubscriptionPack = new SubscriptionPack();
  tednBalance: BigNumber;
  tednBalanceAdjusted: BigNumber;

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
    private events: Events
  ) {}

  ngOnInit() {
    this.events.subscribe('get.tw-main.height', () => {
      const firstRect = this.element.nativeElement.getBoundingClientRect();
      this.logger.debug('send first rect');
      if (firstRect) {
        this.events.publish('set.tw-main.height', firstRect.height + 'px');
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
          this.walletId = String(params['id']);
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }
  ionViewDidLeave() {
    this.subscriptionPack.clear();
  }

  handleAliasEditing() {}
}
