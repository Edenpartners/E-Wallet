import { Injectable } from '@angular/core';

import { UUID } from 'angular2-uuid';

import { AppVersion } from '@ionic-native/app-version/ngx';
import { environment as env } from '../../environments/environment';

import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  Input,
  SimpleChanges,
  OnChanges,
  ViewChild
} from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'ngx-clipboard';
import { EtherDataService } from './etherData.service';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';

import { WalletService, WalletTypes } from './wallet.service';

import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherApiService } from './etherApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from 'src/app/providers/appStorage.service';
import { Subscription, of, Observable } from 'rxjs';
import { Subscriber } from 'rxjs';

import { listutil } from '../utils/listutil';

export class ValueTracker {
  logger: NGXLogger;

  id: string = null;
  value: any = null;
  private children: { [id: string]: ValueTracker } = {};

  private _trackHandler: any = null;
  private _startTime: number = null;

  private _timeout = -1;
  private _maxRepeatTime = -1;
  private _repeatTime = 0;
  private _interval = 3000;

  private _cancelled = false;
  private _valueGetter: any = null;

  private subscribers: Array<Subscriber<void>> = [];

  get trackObserver(): Observable<any> {
    const thisRef = this;

    return new Observable(observer => {
      listutil.addItemToList(thisRef.subscribers, observer);

      // When the consumer unsubscribes, clean up data ready for next subscription.
      return {
        unsubscribe() {
          listutil.removeItemFromList(thisRef.subscribers, observer);
        }
      };
    });
  }

  set valueGetter(getter: any) {
    this._valueGetter = getter;
  }

  set interval(val: number) {
    this._interval = val;
  }

  pauseTracking() {
    if (this._trackHandler) {
      clearTimeout(this._trackHandler);
      this._trackHandler = null;
    }
  }

  startTracking(startImmediateley = true) {
    this.logger.debug('start tracking : ' + this.id);
    this._cancelled = false;
    this._startTime = new Date().getTime();
    if (startImmediateley) {
      this.resumeTracking(0);
    } else {
      this.resumeTracking(this._interval);
    }
  }

  cancel() {
    const thisRef = this;
    for (const key of Object.keys(this.children)) {
      const child = thisRef.children[key];
      child.cancel();
    }

    this.logger.debug('cancel tracking' + this.id);
    this.pauseTracking();
    this._cancelled = true;
    listutil.removeSubscribers(this.subscribers);
  }

  resumeTracking(delay) {
    this.pauseTracking();

    if (this._cancelled) {
      return;
    }

    const now = new Date().getTime();
    if (this._timeout >= 0 && now - this._startTime > this._timeout) {
      return;
    }

    if (this._maxRepeatTime >= 0 && this._repeatTime > this._maxRepeatTime) {
      return;
    }

    this._trackHandler = setTimeout(() => {
      this.process();
    }, delay);
  }

  async process() {
    const promise: Promise<any> = this._valueGetter();
    promise
      .then(
        value => {
          this.value = value;
          listutil.notifyToObservers(this.subscribers, this.value);
        },
        error => {}
      )
      .finally(() => {
        this._repeatTime += 1;
        this.resumeTracking(this._interval);
      });
  }

  getChildTracker(childId): ValueTracker {
    if (!this.children[childId]) {
      this.children[childId] = new ValueTracker();
      this.children[childId].logger = this.logger;
      this.children[childId].id = childId;
    }

    return this.children[childId];
  }
}

const PREFIX_WALLET = 'wal_';
const PREFIX_CONTRACT = 'wal_';

@Injectable({
  providedIn: 'root'
})
export class DataTrackerService {
  trackers: { [id: string]: ValueTracker } = {};

  constructor(
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private store: LocalStorageService,
    private etherApi: EtherApiService,
    private storage: AppStorageService
  ) {}

  getTracker(id: string): ValueTracker {
    if (!this.trackers[id]) {
      this.trackers[id] = new ValueTracker();
      this.trackers[id].logger = this.logger;
      this.trackers[id].id = id;
    }

    return this.trackers[id];
  }

  stopTracker(id: string) {
    if (this.trackers[id]) {
      this.trackers[id].cancel();
    }
  }

  startEtherBalanceTracking(walletInfo: WalletTypes.WalletInfo): ValueTracker {
    const tracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    tracker.valueGetter = () => {
      return new Promise((finalResolve, finalReject) => {
        this.etherApi.getEthBalance(walletInfo).then(
          val => {
            finalResolve({
              wei: val,
              ether: ethers.utils.formatEther(val)
            });
          },
          err => {
            finalReject(err);
          }
        );
      });
    };

    tracker.startTracking();
    return tracker;
  }

  stopEtherBalanceTracking(walletInfo: WalletTypes.WalletInfo) {
    const tracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    tracker.cancel();
  }

  startERC20ContractBalanceTracking(
    walletInfo: WalletTypes.WalletInfo,
    ctInfo: WalletTypes.ContractInfo
  ): ValueTracker {
    const walletTracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    const contractBalanceTracker = walletTracker.getChildTracker(
      PREFIX_CONTRACT + ctInfo.address
    );

    contractBalanceTracker.valueGetter = () => {
      return new Promise((finalResolve, finalReject) => {
        this.etherApi.getERC20TokenBalance(walletInfo, ctInfo).then(
          (result: { balance: BigNumber; adjustedBalance: BigNumber }) => {
            finalResolve(result);
          },
          error => {
            finalReject(error);
          }
        );
      });
    };

    contractBalanceTracker.startTracking();
    return contractBalanceTracker;
  }

  stopERC20ContractBalanceTracker(
    walletInfo: WalletTypes.WalletInfo,
    ctInfo: WalletTypes.ContractInfo
  ) {
    const walletTracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    const contractBalanceTracker = walletTracker.getChildTracker(
      PREFIX_CONTRACT + ctInfo.address
    );

    contractBalanceTracker.cancel();
  }

  trackAllWalletsBalance() {}
  startIncompleTransactionsTracker() {}
}
