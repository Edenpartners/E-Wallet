import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
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
import { DecimalPipe, DatePipe } from '@angular/common';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Consts } from '../../../../environments/constants';
import { Events, IonInfiniteScroll, IonContent, IonInput } from '@ionic/angular';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { TextUtils } from 'src/app/utils/textutils';
import { MultilineLayoutDirective } from 'src/app/directives/multiline-layout';
import { BigNumberHelper } from '../../../utils/bigNumberHelper';

import { Subject } from 'rxjs';

import {
  CalendarEvent,
  CalendarDateFormatter,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarView,
  DateFormatterParams,
  CalendarMonthViewComponent
} from 'angular-calendar';

import { CustomDateFormatter } from 'src/app/utils/custom-date-formatter.provider';

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
  styleUrls: ['./tw-tx-list.page.scss'],
  // encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ]
})
export class TwTxListPage implements OnInit, OnDestroy {
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
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: AppStorageTypes.TednWalletInfo;

  isNoData = false;
  txList: Array<TednTransaction> = [];
  filteredTxList: Array<TednTransaction> = [];

  currentPage = 1;
  totalCount = 0;

  tednBalance = null;
  tednBalanceFormatted = null;

  @ViewChild('multilineLabel') multilineLabel;
  @ViewChild('multilineLayout') multilineLayout: MultilineLayoutDirective;

  @ViewChild('historyScroll') historyScroll: IonContent;
  @ViewChild('infiniteScroll') infiniteScroll: IonInfiniteScroll;

  @ViewChild('searchForm') searchForm: ElementRef;
  @ViewChild('searchAddressInput') searchAddressInput: IonInput;
  @ViewChild('calendarContainer') calendarContainer: ElementRef;

  searchAddress = '';
  showCaneldar = false;

  @ViewChild('monthView') calendarMonthView: CalendarMonthViewComponent;
  calendarEvents: CalendarEvent[] = [];
  calendarRefresh: Subject<any> = new Subject();
  calendarViewDate: Date = new Date();
  calendarActiveDayIsOpen = false;
  calendarSelectedDate: Date = null;
  calendarTopPosition = '0px';
  calendarRightPosition = '0px';

  ngOnInit() {}

  ngOnDestroy() {}

  ionViewWillEnter() {
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
                this.multilineLayout.updateLayout();
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

  ionViewWillLeave() {
    this.subscriptionPack.clear();
  }

  ionViewDidLeave() {}

  reloadList(evt?: any) {
    this.infiniteScroll.disabled = false;
    this.isNoData = false;
    this.txList = [];
    this.filteredTxList = [];
    this.currentPage = 1;

    if (evt && evt.target) {
      evt.target.complete();
    }

    this.loadList(this.currentPage, true, () => {
      if (this.txList.length < 1) {
        this.isNoData = true;
      }
    });
  }

  doInfinite(evt: any, controlLoading: boolean = true): Promise<any> {
    return new Promise<any>((finalResolve, finalReject) => {
      this.loadList(this.currentPage + 1, controlLoading, () => {
        this.infiniteScroll.complete();
        if (this.txList.length >= this.totalCount) {
          this.infiniteScroll.disabled = true;
        }

        finalResolve();
      });
    });
  }

  filterTxList() {
    if (!this.searchAddress && !this.calendarSelectedDate) {
      this.filteredTxList = this.txList;
    } else {
      this.filteredTxList = [];
      for (let i = 0; i < this.txList.length; i++) {
        let addToFilteredList = true;
        const tx = this.txList[i];
        if (this.searchAddress) {
          let isAddressMatched = false;
          if (tx.from_addr && tx.from_addr.indexOf(this.searchAddress) >= 0) {
            isAddressMatched = true;
          }
          if (tx.to_addr && tx.to_addr.indexOf(this.searchAddress) >= 0) {
            isAddressMatched = true;
          }
          if (!isAddressMatched) {
            addToFilteredList = false;
          }
        }

        if (this.calendarSelectedDate !== null) {
          let isDateMatched = false;
          if (
            tx.regdate.getFullYear() === this.calendarSelectedDate.getFullYear() &&
            tx.regdate.getMonth() === this.calendarSelectedDate.getMonth() &&
            tx.regdate.getDate() === this.calendarSelectedDate.getDate()
          ) {
            isDateMatched = true;
          }

          if (!isDateMatched) {
            addToFilteredList = false;
          }
        }

        if (addToFilteredList) {
          this.filteredTxList.push(tx);
        }
      }
    }
  }

  loadList(pageNum: number, controlLoading: boolean, onComplete: () => void) {
    this.logger.debug('load page : ' + pageNum);
    if (controlLoading) {
      this.feedbackUI.showLoading();
    }

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

      this.filterTxList();

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
        if (controlLoading) {
          this.feedbackUI.hideLoading();
        }
        onSuccess(resData);
      }, 1000);
    } else {
      this.ednApi
        .getTEDNTransaction(pageNum, countPerPage)
        .then(onSuccess, err => {
          this.feedbackUI.showErrorAndRetryDialog(
            err,
            () => {
              this.loadList(pageNum, controlLoading, onComplete);
            },
            () => {
              onComplete();
            }
          );
        })
        .finally(() => {
          if (controlLoading) {
            this.feedbackUI.hideLoading();
          }
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

  /**
   * Calendar Features
   */

  getCalendarMonth(): number {
    return this.calendarViewDate.getMonth() + 1;
  }

  toggleCalendar() {
    if (this.showCaneldar) {
      this.showCaneldar = false;
    } else {
      this.showCaneldar = true;

      const formElement: HTMLElement = this.searchForm.nativeElement;
      const searchFormRect: ClientRect = formElement.getBoundingClientRect();
      this.logger.debug(searchFormRect);
      this.calendarTopPosition = searchFormRect.bottom + 'px';
    }
  }

  calendarDayClicked(evt: any) {
    this.logger.debug(evt);
    this.logger.debug('calendar day clicked', evt.day.date);
    //if (isSameMonth(date, this.calendarViewDate)) {
    this.calendarViewDate = new Date(evt.day.date);
    //}

    this.calendarSelectedDate = new Date(evt.day.date);
    if (!this.calendarActiveDayIsOpen) {
      this.calendarActiveDayIsOpen = true;
    }

    this.runSearch();
  }

  loadAllHistory(): Promise<any> {
    return new Promise<any>((finalResolve, finalReject) => {
      if (!this.infiniteScroll.disabled) {
        this.feedbackUI.showLoading();
        this.doInfinite(null, false).then(() => {
          this.loadAllHistory().then(
            () => {
              this.feedbackUI.hideLoading();
              finalResolve();
            },
            () => {
              this.feedbackUI.hideLoading();
              finalReject();
            }
          );
        });
      } else {
        finalResolve();
      }
    });
  }

  /**
   * Search
   */
  async runSearch() {
    this.searchAddressInput.getInputElement().then((input: HTMLInputElement) => {
      input.blur();
    });

    this.logger.debug('run search');
    if (!this.infiniteScroll.disabled) {
      await this.loadAllHistory();
    }

    this.filterTxList();
  }

  historyScrollToTop() {
    this.historyScroll.scrollToTop();
  }

  async historyScrollToBottom() {
    if (!this.infiniteScroll.disabled) {
      await this.loadAllHistory();

      this.feedbackUI.showLoading();
      setTimeout(() => {
        this.feedbackUI.hideLoading();
        this.historyScroll.scrollToBottom();
      }, 1000);
    } else {
      this.historyScroll.scrollToBottom();
    }
  }

  onHistoryListChange() {
    this.logger.debug('on history list change');
  }
}
