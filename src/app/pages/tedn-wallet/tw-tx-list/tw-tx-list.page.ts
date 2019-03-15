import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
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
import { Consts } from '../../../../environments/constants';
import { Events, IonInfiniteScroll } from '@ionic/angular';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { TextUtils } from 'src/app/utils/textutils';
import { MultilineLayoutDirective } from 'src/app/directives/multiline-layout';
import { BigNumberHelper } from '../../../utils/bigNumberHelper';

const countPerPage = 30;
const useDummyData = false;

interface TednTransaction {
  isSend: boolean;
  from_addr: string;
  to_addr: string;
  amount: string;
  amountDisplay: string;
  regdate: Date;
  regdateText: string;
}

@Component({
  selector: 'app-tw-tx-list',
  templateUrl: './tw-tx-list.page.html',
  styleUrls: ['./tw-tx-list.page.scss']
})
export class TwTxListPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: AppStorageTypes.TednWalletInfo;

  isNoData = false;
  txList: Array<TednTransaction> = [];
  currentPage = 1;
  totalCount = 0;

  tednBalance = null;
  tednBalanceFormatted = null;

  @ViewChild('multilineLabel') multilineLabel;
  @ViewChild('multilineLayout') multilineLayout: MultilineLayoutDirective;
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

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']);
          this.wallet = this.storage.findTednWalletById(this.walletId);

          if (this.wallet) {
            const tednTracker = this.dataTracker.startTEDNBalanceTracker(this.walletId);

            this.subscriptionPack.addSubscription(() => {
              return tednTracker.trackObserver.subscribe(balance => {
                this.tednBalance = balance;
                this.tednBalanceFormatted = BigNumberHelper.removeZeroPrecision(ethers.utils.formatUnits(balance, Consts.TEDN_DECIMAL));
              });
            });

            this.reloadList();
          }
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  ionViewWillEnter() {}

  ionViewDidLeave() {}

  reloadList(evt?: any) {
    this.infiniteScroll.disabled = false;
    this.isNoData = false;
    this.txList = [];
    this.currentPage = 1;

    if (evt && evt.target) {
      evt.target.complete();
    }

    this.loadList(this.currentPage, () => {
      if (this.txList.length < 1) {
        this.isNoData = true;
      }
    });
  }

  doInfinite(evt) {
    this.loadList(this.currentPage + 1, () => {
      this.infiniteScroll.complete();
      if (this.txList.length >= this.totalCount) {
        this.infiniteScroll.disabled = true;
      }
    });
  }

  loadList(pageNum: number, onComplete: () => void) {
    this.logger.debug('load page : ' + pageNum);
    this.feedbackUI.showLoading();

    let tednPublicKey = null;
    if (this.storage.isSignedIn) {
      tednPublicKey = this.storage.userInfo.tedn_public_key;
    }

    const onSuccess = resData => {
      const data = resData.data;
      this.currentPage = data.currentpage;
      this.totalCount = data.totalcount;
      for (let i = 0; i < data.transactions.length; i++) {
        const item = data.transactions[i];
        let isSend = false;
        if (item.from_addr === tednPublicKey) {
          isSend = true;
        }
        this.txList.push({
          isSend: isSend,
          from_addr: item.from_addr,
          to_addr: item.to_addr,
          amount: item.amount,
          amountDisplay: ethers.utils.formatUnits(String(item.amount), Consts.TEDN_DECIMAL),
          regdate: this.getDate(item.regdate),
          regdateText: this.getDateString(item.regdate)
        });
      }

      onComplete();
    };

    if (useDummyData) {
      const data: any = {};
      const resData = {
        data: data
      };

      data.currentpage = pageNum;
      data.totalcount = 100;
      data.transactions = [];
      for (let i = 0; i < countPerPage; i++) {
        let isEven = false;
        if (i === 0 || i % 2 === 0) {
          isEven = true;
        }
        let fromAddr: string = null;
        let toAddr: string = null;
        if (isEven) {
          fromAddr = tednPublicKey;
          toAddr = UUID.UUID();
        } else {
          fromAddr = UUID.UUID();
          toAddr = tednPublicKey;
        }
        const item = {
          from_addr: fromAddr,
          to_addr: toAddr,
          amount: i * 10000000000,
          regdate: new Date().getTime() / 1000
        };
        data.transactions.push(item);
      }

      setTimeout(() => {
        onSuccess(resData);
        this.feedbackUI.hideLoading();
      }, 1000);
    } else {
      this.ednApi
        .getTEDNTransaction(pageNum, countPerPage)
        .then(onSuccess, err => {
          this.feedbackUI.showErrorAndRetryDialog(
            err,
            () => {
              this.loadList(pageNum, onComplete);
            },
            () => {
              onComplete();
            }
          );
        })
        .finally(() => {
          this.feedbackUI.hideLoading();
        });
    }
  }

  getDate(regdate) {
    return new Date(regdate * 1000);
  }

  getDateString(regdate) {
    return new Date(regdate * 1000).toLocaleDateString();
  }

  onReceiveClick() {
    this.analytics.logEvent({
      category: 'tedn transaction2',
      params: {
        action: 'deposit one click',
        event_label: 'deposit one_deposit one click'
      }
    });

    this.rs.navigateByUrl(`/tedn-deposit/${this.walletId}`);
  }

  onSendClick() {
    this.analytics.logEvent({
      category: 'tedn transaction1',
      params: {
        action: 'withdraw one click',
        event_label: 'withdraw one_withdraw one click'
      }
    });

    this.rs.navigateByUrl(`/tedn-withdraw/${this.walletId}`);
  }
}
