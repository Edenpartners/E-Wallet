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
import { Events, IonInfiniteScroll, IonInput, IonContent } from '@ionic/angular';
import { EwSummary } from '../ew-summary/ew-summary';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

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

import { CustomDateFormatter } from '../../../utils/custom-date-formatter.provider';
import { ViewEncapsulation } from '@angular/compiler/src/core';
import { UUID } from 'angular2-uuid';

const itemCountPerPage = 50;
const useDummyData = false;

@Component({
  selector: 'app-ew-tx-list',
  templateUrl: './ew-tx-list.page.html',
  styleUrls: ['./ew-tx-list.page.scss'],
  //encapsulation: ViewEncapsulation.None
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ]
})
export class EwTxListPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  isNoData = false;
  currentPageIndex = 0;
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;
  filteredTxList: Array<AppStorageTypes.Tx.TxRowData> = [];
  txList: Array<AppStorageTypes.Tx.TxRowData> = [];

  @ViewChild('summary') summary: EwSummary;
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

    this.loadList(0, true, addedCount => {
      if (this.txList.length < 1) {
        this.isNoData = true;
      }
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

          if (this.isSendTx(tx)) {
            if (tx.info.to && tx.info.to.indexOf(this.searchAddress) >= 0) {
              isAddressMatched = true;
            }
          } else {
            if (tx.info.from && tx.info.from.indexOf(this.searchAddress) >= 0) {
              isAddressMatched = true;
            }
          }

          if (!isAddressMatched) {
            addToFilteredList = false;
          }
        }

        if (this.calendarSelectedDate !== null) {
          let isDateMatched = false;
          const cDateObj: Date = new Date(tx.cDate);

          if (
            cDateObj.getFullYear() === this.calendarSelectedDate.getFullYear() &&
            cDateObj.getMonth() === this.calendarSelectedDate.getMonth() &&
            cDateObj.getDate() === this.calendarSelectedDate.getDate()
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

  doInfinite(evt, controlLoading: boolean = true): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      this.loadList(this.currentPageIndex + 1, controlLoading, addedCount => {
        this.infiniteScroll.complete();
        if (addedCount <= 0) {
          this.infiniteScroll.disabled = true;
        }

        finalResolve();
      });
    });
  }

  async loadList(pageIndex: number, controlLoading: boolean, onComplete) {
    this.feedbackUI.showLoading();

    let list: Array<AppStorageTypes.Tx.TxRowData> = [];

    if (useDummyData) {
      if (pageIndex < 3) {
        for (let i = 0; i < itemCountPerPage; i++) {
          let subType: AppStorageTypes.Tx.TxSubType = AppStorageTypes.Tx.TxSubType.Send;
          if (i % 2 === 0) {
            subType = AppStorageTypes.Tx.TxSubType.Receive;
          }

          // {
          //   type: TxType;
          //   subType: TxSubType;
          //   state: TxRowState;
          //   hash: string;
          //   logs: Array<TxPartialLog>;
          //   info: any;
          //   cDate: number;
          //   mDate: number;
          //   customData?: string;
          // }

          list.push({
            type: AppStorageTypes.Tx.TxType.EthERC20Transfer,
            subType: subType,
            state: AppStorageTypes.Tx.TxRowState.Closed,
            hash: UUID.UUID(),
            info: { amount: { display: i }, from: UUID.UUID(), to: UUID.UUID() },
            cDate: new Date().getTime(),
            mDate: new Date().getTime(),
            logs: []
          });
        }
      }
    } else {
      list = await this.storage.getTxListForPaging(this.wallet, pageIndex, itemCountPerPage, true, AppStorageTypes.Tx.TxRowState.Closed);
    }

    list.forEach(item => {
      this.txList.push(item);
    });

    if (list.length > 0) {
      this.currentPageIndex = pageIndex;
    }

    this.filterTxList();

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
