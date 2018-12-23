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
import { DecimalPipe } from '@angular/common';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';

@Component({
  selector: 'app-ew-tx-list',
  templateUrl: './ew-tx-list.page.html',
  styleUrls: ['./ew-tx-list.page.scss']
})
export class EwTxListPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  currentPageIndex = 0;
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;
  txList: Array<AppStorageTypes.TxRowData> = [];

  @ViewChild('background') background: ElementRef;

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
    private events: Events
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
        this.loadList(0, addedCount => {});
      });
    });

    this.events.subscribe('set.ew-main.height', height => {
      this.background.nativeElement.style.height = height;
    });
    this.events.publish('get.ew-main.height');
  }

  ionViewDidLeave() {
    this.subscriptionPack.clear();
    this.events.unsubscribe('set.ew-main.height');
  }

  loadList(pageIndex: number, onComplete) {
    this.feedbackUI.showLoading();

    const list = this.storage.getTxListForPaging(
      this.wallet,
      this.currentPageIndex,
      100,
      true,
      (item: AppStorageTypes.TxRowData) => {
        for (let j = 0; j < item.logs.length; j++) {
          const logItem = item.logs[j];
          if (logItem.state === AppStorageTypes.TxState.Receipted) {
            return true;
          }
        }

        return false;
      }
    );

    list.forEach(item => {
      this.txList.push(item);
    });

    if (list.length > 0) {
      this.currentPageIndex = pageIndex;
    }

    onComplete(list.length);
    setTimeout(() => {
      this.feedbackUI.hideLoading();
    }, 300);
  }

  onSendClick() {
    this.rs.navigateByUrl(`/ew-main/sub/${this.wallet.id}/(sub:send)`);
  }

  onReceiveClick() {
    this.rs.navigateByUrl(`/ew-main/sub/${this.wallet.id}/(sub:qrcode)`);
  }

  getDateString(timeVal) {
    //return new Date(timeVal).toLocaleString();
    return new Date(timeVal).toLocaleDateString();
  }

  isSendTx(txItem: AppStorageTypes.TxRowData) {
    if (txItem.subType === AppStorageTypes.TxSubType.Send) {
      return true;
    }

    return false;
  }

  doInfinite(evt) {
    this.loadList(this.currentPageIndex + 1, addedCount => {
      evt.target.complete();
      if (addedCount <= 0) {
        evt.target.disabled = true;
      }
    });
  }
}
