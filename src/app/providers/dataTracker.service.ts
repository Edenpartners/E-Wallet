import { Injectable } from '@angular/core';

import { UUID } from 'angular2-uuid';

import { AppVersion } from '@ionic-native/app-version/ngx';
import { environment as env } from '../../environments/environment';

import { Component, OnInit, OnDestroy, EventEmitter, Output, Input, SimpleChanges, OnChanges, ViewChild } from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { EtherDataService } from './etherData.service';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';

import { WalletService, WalletTypes } from './wallet.service';

import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherApiService } from './etherApi.service';
import { AppStorageTypes, AppStorageService } from 'src/app/providers/appStorage.service';
import { Subscription, of, Observable } from 'rxjs';
import { Subscriber } from 'rxjs';

import { listutil } from '../utils/listutil';
import { EdnRemoteApiService } from '../providers/ednRemoteApi.service';

export class ValueTracker {
  logger: NGXLogger;

  id: string = null;
  value: any = null;
  private children: { [id: string]: ValueTracker } = {};

  private _trackHandler: any = null;
  private _startTime: number = null;

  private _timeout = -1;
  private _maxRunCount = -1;
  private _runCount = 0;
  private _interval = 7000;

  private _tracking = false;
  private _cancelled = false;
  private _valueGetter: () => Promise<any> = null;

  private subscribers: Array<Subscriber<void>> = [];

  get trackObserver(): Observable<any> {
    const thisRef = this;

    return new Observable(observer => {
      listutil.addItemToList(thisRef.subscribers, observer);

      if (this.value) {
        observer.next(this.value);
      }

      // When the consumer unsubscribes, clean up data ready for next subscription.
      return {
        unsubscribe() {
          listutil.removeItemFromList(thisRef.subscribers, observer);
        }
      };
    });
  }

  set valueGetter(getter: () => Promise<any>) {
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
    this._tracking = true;
    this._startTime = new Date().getTime();
    if (startImmediateley) {
      this.resumeTracking(0);
    } else {
      this.resumeTracking(this._interval);
    }
  }

  get isTracking() {
    return this._tracking;
  }

  get isCancelled() {
    return this._cancelled;
  }

  cancel() {
    for (const key of Object.keys(this.children)) {
      this.stopChildTracker(key);
    }

    this.logger.debug(`cancel tracking : ${this.id}`);
    this.pauseTracking();
    this._cancelled = true;
    this._tracking = false;
    listutil.removeSubscribers(this.subscribers);
  }

  resumeTracking(delay) {
    this.pauseTracking();

    if (this._cancelled) {
      return;
    }

    const now = new Date().getTime();
    if (this._timeout >= 0 && now - this._startTime > this._timeout) {
      this.cancel();
      return;
    }

    if (this._maxRunCount >= 0 && this._runCount > this._maxRunCount) {
      this.cancel();
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
          this._runCount += 1;
          this.value = value;
          listutil.notifyToObservers(this.subscribers, this.value);
        },
        error => {}
      )
      .finally(() => {
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

  startChildTracker(childId, valueGetter: () => Promise<any>): ValueTracker {
    const tracker = this.getChildTracker(childId);
    if (tracker.isTracking === false) {
      tracker.valueGetter = valueGetter;
      tracker.startTracking();
    }

    return tracker;
  }

  stopChildTracker(childId, removeFromList = false) {
    if (this.children[childId]) {
      this.children[childId].cancel();
      if (removeFromList) {
        delete this.children[childId];
      }
    }
  }
}

const PREFIX_WALLET = 'wal_';
const PREFIX_CONTRACT = 'ctrt_';
const PREFIX_TEDN_WALLET = 'twal_';

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
    private storage: AppStorageService,
    private ednApi: EdnRemoteApiService
  ) {}

  getTracker(id: string): ValueTracker {
    if (!this.trackers[id]) {
      this.trackers[id] = new ValueTracker();
      this.trackers[id].logger = this.logger;
      this.trackers[id].id = id;
    }

    return this.trackers[id];
  }

  startTracker(id: string, valueGetter: () => Promise<any>): ValueTracker {
    const tracker = this.getTracker(id);
    if (tracker.isTracking === false) {
      tracker.valueGetter = valueGetter;
      tracker.startTracking();
    }

    return tracker;
  }

  stopTracker(id: string, removeFromList = false) {
    if (this.trackers[id]) {
      this.trackers[id].cancel();
      if (removeFromList) {
        delete this.trackers[id];
      }
    }
  }

  removeAllTrackers() {
    const allKeys: Array<string> = Object.keys(this.trackers);
    allKeys.forEach(key => {
      this.stopTracker(key, true);
    });
  }

  startEtherBalanceTracking(walletInfo: WalletTypes.EthWalletInfo): ValueTracker {
    const valueGetter = () => {
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

    return this.startTracker(PREFIX_WALLET + walletInfo.id, valueGetter);
  }

  stopEtherBalanceTracking(walletInfo: WalletTypes.EthWalletInfo) {
    this.stopTracker(PREFIX_WALLET + walletInfo.id);
  }

  startERC20ContractBalanceTracking(walletInfo: WalletTypes.EthWalletInfo, ctInfo: WalletTypes.ContractInfo): ValueTracker {
    const walletTracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    const contractBalanceTrackerKey = PREFIX_CONTRACT + ctInfo.address;
    const contractBalanceGetter = () => {
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

    return walletTracker.startChildTracker(contractBalanceTrackerKey, contractBalanceGetter);
  }

  stopERC20ContractBalanceTracker(walletInfo: WalletTypes.EthWalletInfo, ctInfo: WalletTypes.ContractInfo) {
    const walletTracker = this.getTracker(PREFIX_WALLET + walletInfo.id);
    walletTracker.stopChildTracker(PREFIX_CONTRACT + ctInfo.address);
  }

  startTEDNBalanceTracker(id: string) {
    const valueGetter = () => {
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

    return this.startTracker(PREFIX_TEDN_WALLET + id, valueGetter);
  }

  stopTEDNBalanceTracker(id: string) {
    this.stopTracker(PREFIX_TEDN_WALLET + id);
  }

  trackAllWalletsBalance() {}
  startIncompleTransactionsTracker() {}
}
