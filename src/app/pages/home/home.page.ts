import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../providers/router.service';

import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../providers/ether.service';
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
import { EtherDataService } from '../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../providers/kybernetwork.service';
import { EtherApiService } from '../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

import {
  DataTrackerService,
  ValueTracker
} from '../../providers/dataTracker.service';

import { SubscriptionPack } from '../../utils/listutil';
import { DecimalPipe } from '@angular/common';
import { env } from '../../../environments/environment';
import { Consts } from '../../../environments/constants';
import { Events } from '@ionic/angular';

interface WalletRow {
  /** just index */
  id: number;
  data: WalletTypes.EthWalletInfo;
  ethBalanceWei: BigNumber;
  ethBalanceEther: string;
  ednBalance: BigNumber;
  ednBalanceAdjusted: BigNumber;
  ednBalanceDisplay: string;
  deleted: boolean;
}

interface TEDNWalletRow {
  /** just index */
  id: number;
  data: AppStorageTypes.TednWalletInfo;
  tednBalance: string;
  tednBalanceFormatted: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
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
    private events: Events
  ) {}
  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  wallets: Array<WalletRow> = [];
  tednWallets: Array<TEDNWalletRow> = [];

  showWalletsOrderIcon = false;
  showTednWalletsOrderIcon = false;

  ngOnInit() {
    this.refreshTednList();
    this.refreshList();
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  onEdnWalletClick() {}

  toggleSideMenu() {
    this.logger.debug('ui:openSideMenu');
    this.events.publish('ui:openSideMenu');
  }

  onWalletItemClick(walletRow: WalletRow) {
    this.rs.navigateByUrl(`/ew-main/sub/${walletRow.data.id}/(sub:list)`);
  }

  onTednWalletItemClick(tednWalletRow: TEDNWalletRow) {
    this.rs.navigateByUrl(`/tw-main/sub/${tednWalletRow.data.id}/(sub:list)`);
  }

  refreshTednList() {
    for (let i = 0; i < this.tednWallets.length; i++) {
      const item = this.tednWallets[i];
      this.subscriptionPack.removeSubscriptionsByKey(item);
      this.dataTracker.stopTEDNBalanceTracker(item.data.id);

      this.tednWallets.splice(i, 1);
      i -= 1;
    }

    const allWallet = this.storage.getTednWallets();
    this.logger.debug('refresh list : ' + allWallet.length);
    this.logger.debug('refresh list : ' + this.wallets.length);

    allWallet.forEach((item, index) => {
      this.logger.debug('add new wallet row');
      const walletRow: TEDNWalletRow = {
        id: index,
        tednBalance: null,
        tednBalanceFormatted: null,
        data: item
      };

      this.tednWallets.push(walletRow);

      const tednTracker = this.dataTracker.startTEDNBalanceTracker(
        walletRow.data.id
      );
      //subscribe tedn tracking
      this.subscriptionPack.addSubscription(() => {
        return tednTracker.trackObserver.subscribe(balance => {
          walletRow.tednBalance = balance;
          walletRow.tednBalanceFormatted = ethers.utils.formatUnits(
            balance,
            Consts.TEDN_DECIMAL
          );
        });
      });
    });

    this.showTednWalletsOrderIcon = this.tednWallets.length > 0;
  }

  refreshList() {
    for (let i = 0; i < this.wallets.length; i++) {
      const item = this.wallets[i];
      this.subscriptionPack.removeSubscriptionsByKey(item);
      this.dataTracker.stopEtherBalanceTracking(item.data);

      this.wallets.splice(i, 1);
      i -= 1;
    }

    const allWallet = this.storage.getWallets();
    this.logger.debug('refresh list : ' + allWallet.length);
    this.logger.debug('refresh list : ' + this.wallets.length);

    allWallet.forEach((item, index) => {
      this.logger.debug('add new wallet row');
      const walletRow: WalletRow = {
        id: index,
        data: item,
        ethBalanceWei: null,
        ethBalanceEther: null,
        ednBalance: null,
        ednBalanceAdjusted: null,
        ednBalanceDisplay: null,
        deleted: false
      };

      // add eth tracker
      const ethTracker = this.dataTracker.startEtherBalanceTracking(
        walletRow.data
      );

      this.subscriptionPack.addSubscription(() => {
        return ethTracker.trackObserver.subscribe(value => {
          walletRow.ethBalanceWei = value.wei;
          walletRow.ethBalanceEther = value.ether;
        });
      }, walletRow);

      if (ethTracker.value) {
        walletRow.ethBalanceWei = ethTracker.value.wei;
        walletRow.ethBalanceEther = ethTracker.value.ether;
      }

      // add edn tracker
      const p: EthProviders.Base = this.eths.getProvider(
        walletRow.data.info.provider
      );
      const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
        env.config.ednCoinKey,
        p
      );

      const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(
        walletRow.data,
        ednContractInfo
      );

      this.subscriptionPack.addSubscription(() => {
        return ednTracker.trackObserver.subscribe(
          (value: { balance: BigNumber; adjustedBalance: BigNumber }) => {
            walletRow.ednBalance = value.balance;
            walletRow.ednBalanceAdjusted = value.adjustedBalance;
            walletRow.ednBalanceDisplay = value.adjustedBalance.toString();
          }
        );
      }, walletRow);

      if (ednTracker.value) {
        walletRow.ednBalance = ednTracker.value.balance;
        walletRow.ednBalanceAdjusted = ednTracker.value.adjustedBalance;
        walletRow.ednBalanceDisplay = ednTracker.value.adjustedBalance.toString();
      }

      this.wallets.push(walletRow);
    }); //end of foreach

    this.showWalletsOrderIcon = this.wallets.length > 0;
  }
}
