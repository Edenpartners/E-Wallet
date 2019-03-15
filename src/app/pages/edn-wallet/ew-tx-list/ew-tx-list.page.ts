import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { DataTrackerService, ValueTracker } from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { DecimalPipe } from '@angular/common';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events, IonInfiniteScroll } from '@ionic/angular';
import { EwSummary } from '../ew-summary/ew-summary';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const itemCountPerPage = 100;

@Component({
  selector: 'app-ew-tx-list',
  templateUrl: './ew-tx-list.page.html',
  styleUrls: ['./ew-tx-list.page.scss']
})
export class EwTxListPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  isNoData = false;
  currentPageIndex = 0;
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;
  txList: Array<AppStorageTypes.Tx.TxRowData> = [];

  @ViewChild('summary') summary: EwSummary;
  @ViewChild('infiniteScroll') infiniteScroll: IonInfiniteScroll;

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
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.logger.debug('will enter tx');
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']); // (+) converts string 'id' to a number
          this.wallet = this.storage.findWalletById(this.walletId);
          this.logger.debug('a wallet ' + this.wallet.id);

          this.reloadList();

          this.summary.startGetInfo(this.walletId);
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ionViewWillLeave() {
    this.logger.debug('will leave tx');
    this.summary.stopGetInfo();
  }
  ionViewDidLeave() {
    this.logger.debug('did leave tx');
    this.subscriptionPack.clear();
  }

  reloadList(evt?: any) {
    this.infiniteScroll.disabled = false;
    this.isNoData = false;
    this.currentPageIndex = 0;
    this.txList = [];

    if (evt && evt.target) {
      evt.target.complete();
    }

    this.loadList(0, addedCount => {
      if (this.txList.length < 1) {
        this.isNoData = true;
      }
    });
  }

  doInfinite(evt) {
    this.loadList(this.currentPageIndex + 1, addedCount => {
      this.infiniteScroll.complete();
      if (addedCount <= 0) {
        this.infiniteScroll.disabled = true;
      }
    });
  }

  async loadList(pageIndex: number, onComplete) {
    this.feedbackUI.showLoading();

    const list = await this.storage.getTxListForPaging(
      this.wallet,
      pageIndex,
      itemCountPerPage,
      true,
      AppStorageTypes.Tx.TxRowState.Closed
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
    this.analytics.logEvent({
      category: 'edn transaction1',
      params: {
        action: 'send one click',
        event_label: 'send one_send one click'
      }
    });

    this.rs.navigateByUrl(`/ew-sendto/${this.wallet.id}`);
  }

  onReceiveClick() {
    this.analytics.logEvent({
      category: 'edn transaction2',
      params: {
        action: 'receive click',
        event_label: 'receive_receive click'
      }
    });

    this.rs.navigateByUrl(`/ew-qrcode/${this.wallet.id}`);
  }

  getDate(timeVal) {
    return new Date(timeVal);
  }

  getDateString(timeVal) {
    //return new Date(timeVal).toLocaleString();
    return new Date(timeVal).toLocaleDateString();
  }

  isSendTx(txItem: AppStorageTypes.Tx.TxRowData) {
    if (txItem.subType === AppStorageTypes.Tx.TxSubType.Send) {
      return true;
    }

    return false;
  }
}
