import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd } from '@angular/router';

import { RouterService } from '../../providers/router.service';

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
import { env } from '../../../environments/environment';

@Component({
  selector: 'app-redirector',
  templateUrl: './redirector.page.html',
  styleUrls: ['./redirector.page.scss']
})
export class RedirectorPage implements OnInit, OnDestroy {
  redirect: string = null;
  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.redirect = String(params['redirect']);
          this.tryRedirect();
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return this.rs.getRouter().events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.logger.debug('on navigation end');
        }
      });
    });
  }

  tryRedirect() {
    if (!this.redirect) {
      setTimeout(() => {
        this.tryRedirect();
      }, 100);
      return;
    }

    if (this.redirect.indexOf('/redirector') !== 0) {
      this.logger.debug('redirect to : ' + this.redirect);
      setTimeout(() => {
        this.rs.navigateByUrl(this.redirect);
      }, 100);
    }
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }
}
