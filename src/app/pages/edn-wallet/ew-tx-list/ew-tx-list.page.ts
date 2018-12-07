import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../../providers/config.service';
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

@Component({
  selector: 'app-ew-tx-list',
  templateUrl: './ew-tx-list.page.html',
  styleUrls: ['./ew-tx-list.page.scss']
})
export class EwTxListPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: WalletTypes.EthWalletInfo;
  txList: Array<AppStorageTypes.TxData> = [];

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService
  ) {}

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
        this.refershList();
      });
    });
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  refershList() {
    this.txList = this.storage.getTxList(
      this.wallet,
      (item: AppStorageTypes.TxData) => {
        for (let j = 0; j < item.logs.length; j++) {
          const logItem = item.logs[j];
          if (logItem.state === AppStorageTypes.TxState.Receipted) {
            return true;
          }
        }

        return false;
      },
      (itemA: AppStorageTypes.TxData, itemB: AppStorageTypes.TxData) => {
        if (itemA.cDate > itemB.cDate) {
          return -1;
        } else if (itemA.cDate < itemB.cDate) {
          return 1;
        }
        return 0;
      }
    );
  }

  onSendClick() {
    this.rs.goTo(`/ew-main/sub/${this.wallet.id}/(sub:send)`);
  }

  onReceiveClick() {
    this.rs.goTo(`/ew-main/sub/${this.wallet.id}/(sub:qrcode)`);
  }

  getDateString(timeVal) {
    //return new Date(timeVal).toLocaleString();
    return new Date(timeVal).toLocaleDateString();
  }

  isSendTx(txItem: AppStorageTypes.TxData) {
    if (txItem.subType === AppStorageTypes.TxSubType.Send) {
      return true;
    }

    return false;
  }
}
