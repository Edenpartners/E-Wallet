import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Observable, interval, Subscription, UnsubscriptionError } from 'rxjs';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { Input } from '@ionic/angular';
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
import { Consts } from '../../../../environments/constants';

const countPerPage = 30;
const useDummyData = false;

interface TednTransaction {
  isSend: boolean;
  from_addr: string;
  to_addr: string;
  amount: string;
  regdate: number;
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

  txList: Array<TednTransaction> = [];
  currentPage = 1;
  totalCount = 0;

  tednBalance = null;
  tednBalanceFormatted = null;

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
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.currentPage = 1;

    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findTednWalletById(this.walletId);

        if (this.wallet) {
          const tednTracker = this.dataTracker.startTEDNBalanceTracker(
            this.walletId
          );

          this.subscriptionPack.addSubscription(() => {
            return tednTracker.trackObserver.subscribe(balance => {
              this.tednBalance = balance;
              this.tednBalanceFormatted = ethers.utils.formatUnits(
                balance,
                Consts.TEDN_DECIMAL
              );
            });
          });

          this.loadList(this.currentPage, () => {});
        }
      });
    });
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  loadList(pageNum, onComplete: () => void) {
    this.logger.debug('load page : ' + pageNum);
    this.feedbackUI.showLoading();

    const onSuccess = resData => {
      const data = resData.data;
      this.currentPage = data.currentpage;
      this.totalCount = data.totalcount;
      for (let i = 0; i < data.transactions.length; i++) {
        const item = data.transactions[i];
        const isSend = true;
        this.txList.push({
          isSend: isSend,
          from_addr: item.from_addr,
          to_addr: item.to_addr,
          amount: item.amount,
          regdate: item.regdate,
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
        const item = {
          from_addr: UUID.UUID(),
          to_addr: UUID.UUID(),
          amount: i,
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

  getDateString(regdate) {
    return new Date().toLocaleString();
  }

  isSendTx(tx: TednTransaction) {
    return tx.isSend;
  }

  doInfinite(evt) {
    this.loadList(this.currentPage + 1, () => {
      evt.target.complete();
      if (this.txList.length >= this.totalCount) {
        evt.target.disabled = true;
      }
    });
  }

  onReceiveClick() {
    this.rs.navigateByUrl(
      `/tw-main/sub/${this.walletId}/(sub:trade)?mode=deposit`
    );
  }

  onSendClick() {
    this.rs.navigateByUrl(
      `/tw-main/sub/${this.walletId}/(sub:trade)?mode=withdraw`
    );
  }
}
