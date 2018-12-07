import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../providers/router.service';

import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../providers/config.service';
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
  tednBalance: string;
  tednBalanceParsed: string;
  color: string;
}

const TDEN_BALANCE_TRACKER_KEY = 'tedn_balance';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
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
  ) {
    this.tednWallets.push({
      id: 0,
      tednBalance: null,
      tednBalanceParsed: null,
      color: '#69f1e4'
    });
    this.showTednWalletsOrderIcon = this.tednWallets.length > 0;
  }
  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  wallets: Array<WalletRow> = [];
  tednWallets: Array<TEDNWalletRow> = [];

  showWalletsOrderIcon = false;
  showTednWalletsOrderIcon = false;

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.storage.userStateObserver.subscribe(user => {
        this.refreshList();
      });
    });
  }

  ngOnDestroy() {
    this.logger.debug('destroy home');
    this.subscriptionPack.clear();
  }

  onEdnWalletClick() {}

  ionViewWillEnter() {
    this.refreshList();

    const tednTracker = this.dataTracker.getTracker(TDEN_BALANCE_TRACKER_KEY);
    tednTracker.valueGetter = () => {
      return new Promise((finalResolve, finalReject) => {
        this.ednApi.getTEDNBalance().then(
          resultData => {
            finalResolve(resultData.data.amount);
          },
          resultErr => {
            finalReject(resultErr);
          }
        );
      });
    };
    tednTracker.startTracking();

    //subscribe tedn tracking
    this.subscriptionPack.addSubscription(() => {
      return tednTracker.trackObserver.subscribe(balance => {
        this.tednWallets[0].tednBalance = balance;
        this.tednWallets[0].tednBalanceParsed = ethers.utils.formatUnits(
          balance,
          18
        );
      });
    });
  }

  ionViewDidEnter() {
    this.logger.debug('view did enter');
  }
  ionViewWillLeave() {
    this.logger.debug('view will leave');
    this.dataTracker.stopTracker(TDEN_BALANCE_TRACKER_KEY);
  }

  onWalletItemClick(walletRow: WalletRow) {
    //[href]="['/ew-main/sub',item.data.id]"
    this.rs.goTo(`/ew-main/sub/${walletRow.data.id}/(sub:list)`);
  }

  refreshList() {
    for (let i = 0; i < this.wallets.length; i++) {
      const item = this.wallets[i];
      this.subscriptionPack.removeSubscriptionsByKey(item);
      this.dataTracker.stopEtherBalanceTracking(item.data);

      this.wallets.splice(i, 1);
      i -= 1;
    }

    const allWallet = this.storage.getWallets(true, false);
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
