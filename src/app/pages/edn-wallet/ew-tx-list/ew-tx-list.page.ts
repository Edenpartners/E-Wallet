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
import { EwSummary } from '../../../components/ew-summary/ew-summary';

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

  @ViewChild('summary') summary: EwSummary;

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
    this.logger.debug('will enter tx');
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']); // (+) converts string 'id' to a number
          this.wallet = this.storage.findWalletById(this.walletId);
          this.logger.debug('a wallet ' + this.wallet.id);
          this.loadList(0, addedCount => {});

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
    this.rs.navigateByUrl(`/ew-sendto/${this.wallet.id}`);
  }

  onReceiveClick() {
    this.rs.navigateByUrl(`/ew-qrcode/${this.wallet.id}`);
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
