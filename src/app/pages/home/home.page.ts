import { Component, OnInit } from '@angular/core';
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
import { Observable, interval } from 'rxjs';
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

interface WalletRow {
  /** just index */
  id: number;
  data: WalletTypes.WalletInfo;
  contractsExpanded: boolean;
  transactionsExpanded: boolean;
  ethBalanceWei: BigNumber;
  ethBalanceEther: string;
  etherBalanceGetter: any;
  deleted: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  wallets: Array<WalletRow> = [];

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
    private storage: AppStorageService
  ) {}

  ngOnInit() {}

  onEdnWalletClick() {}

  ionViewWillEnter() {
    this.refreshList();
  }

  gotoApiTest() {
    this.rs.goTo('/ednapitest');
  }

  signout() {
    this.ednApi.signoutFirebase().then(result => {
      this.storage.wipeData();
      this.ednApi.signout();
    });
  }

  refreshList() {
    for (let i = 0; i < this.wallets.length; i++) {
      const item = this.wallets[i];
      if (item.deleted === true) {
        this.wallets.splice(i, 1);
        i -= 1;
      }
    }

    [].forEach((item, index) => {
      const result = this.wallets.find(obj => {
        return obj.data.id === item.id;
      });

      if (!result) {
        const walletRow: WalletRow = {
          id: index,
          data: item,
          contractsExpanded: false,
          transactionsExpanded: false,
          ethBalanceWei: null,
          ethBalanceEther: null,
          etherBalanceGetter: null,
          deleted: false
        };

        this.startEtherBalanceRetrieving(walletRow);
        this.wallets.push(walletRow);
      }
    });
  }

  startEtherBalanceRetrieving(walletRow: WalletRow, forced = false) {
    if (walletRow.etherBalanceGetter !== null && forced === false) {
      this.logger.debug('balance already getting');
      return;
    }

    if (walletRow.etherBalanceGetter !== null) {
      window.clearTimeout(walletRow.etherBalanceGetter);
      walletRow.etherBalanceGetter = null;
    }
    walletRow.etherBalanceGetter = window.setTimeout(() => {
      this.retrieveEtherBalance(walletRow);
    }, 0);
  }

  retrieveEtherBalance(walletRow: WalletRow) {
    const clearWork = () => {
      if (walletRow.etherBalanceGetter !== null) {
        window.clearTimeout(walletRow.etherBalanceGetter);
        walletRow.etherBalanceGetter = null;
      }
    };

    const restartWork = () => {
      clearWork();
      walletRow.etherBalanceGetter = window.setTimeout(() => {
        this.retrieveEtherBalance(walletRow);
      }, delay);
    };

    if (walletRow.deleted === true) {
      clearWork();
      this.logger.debug('wallet deleted');
      return;
    }

    const delay = 3000;

    this.etherApi.getEthBalance(walletRow.data).then(
      val => {
        walletRow.ethBalanceWei = val;
        walletRow.ethBalanceEther = ethers.utils.formatEther(val);

        restartWork();
      },
      err => {
        this.logger.debug(err);
        restartWork();
      }
    );
  }
}
