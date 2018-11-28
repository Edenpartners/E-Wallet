import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../providers/router.service';

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

interface WalletRow {
  /** just index */
  id: number;
  data: WalletTypes.WalletInfo;
  ethBalanceWei: BigNumber;
  ethBalanceEther: string;
  ednBalance: BigNumber;
  ednBalanceAdjusted: BigNumber;
  deleted: boolean;
}

const TDEN_BALANCE_TRACKER_KEY = 'tedn_balance';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
  constructor(
    private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService
  ) {}
  wallets: Array<WalletRow> = [];
  subscriptionPack: SubscriptionPack = new SubscriptionPack();
  tednBalance = '-';

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
        this.tednBalance = balance;
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

  gotoApiTest() {
    this.rs.goTo('/ednapitest');
  }

  signout() {
    this.ednApi.signout().finally(() => {
      this.ednApi.signoutFirebase().then(() => {
        this.storage.wipeData();
      });
    });
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
        deleted: false
      };

      const tracker = this.dataTracker.startEtherBalanceTracking(
        walletRow.data
      );

      const p: EthProviders.Base = this.eths.getProvider(
        walletRow.data.provider
      );
      const ednContractInfo = this.etherData.contractResolver.getEDNContractInfo(
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
          }
        );
      }, walletRow);

      this.subscriptionPack.addSubscription(() => {
        return tracker.trackObserver.subscribe(value => {
          walletRow.ethBalanceWei = value.wei;
          walletRow.ethBalanceEther = value.ether;
        });
      }, walletRow);
      this.wallets.push(walletRow);
    });
  }
}
