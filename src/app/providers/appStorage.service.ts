import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase';
import { Platform, ItemSliding } from '@ionic/angular';
import { UUID } from 'angular2-uuid';

import { AppVersion } from '@ionic-native/app-version/ngx';
import { LocalStorageService, LocalStorage } from 'ngx-store';
import { Observable, Subscriber } from 'rxjs';
import { WalletTypes } from './wallet.service';
import { EthProviders } from '../providers/ether.service';
import { environment as env } from '../../environments/environment';
import { listutil } from '../utils/listutil';
import { Consts } from 'src/environments/constants';

export namespace AppStorageTypes {
  export interface User {
    fbUser: firebase.User;
    userInfo: UserInfo;
  }

  export interface UserAdditionalInfo {
    pinNumber?: string;
    termsAndConditionsAllowed: boolean;
    privacyAllowed: boolean;
  }

  export interface UserInfo {
    display_name: string | undefined | null;
    email: string | undefined | null;
    eth_address: string | undefined | null;
    phone_number: string | undefined | null;
    tedn_public_key: string | undefined | null;
  }

  export interface TxInfo {
    startIndex: number;
    endIndex: number;
    countPerGroup: number;
    incompleteSearchIndex: number;
  }

  export enum TxState {
    Created = 'Created',
    Receipted = 'Receipted'
  }

  export enum TxType {
    EthTransfer = 'EthTransfer',
    EthERC20Transfer = 'EthERC20Transfer',
    KyberNetworkTrade = 'KyberNetworkTrade'
  }

  export enum TxSubType {
    Send = 'Send',
    Receive = 'Receive',
    Trade = 'Trade'
  }

  export interface TxPartialLog {
    state: TxState;
    date: number;
    data?: any;
  }

  export enum TxRowState {
    Opened = 'Opened',
    Closed = 'Closed'
  }

  export interface TxRowData {
    type: TxType;
    subType: TxSubType;
    state: TxRowState;
    hash: string;
    logs: Array<TxPartialLog>;
    info: any;
    cDate: number;
    mDate: number;
    customData?: any;
  }

  export interface TednWalletInfo {
    id: string;
    name: string;
    color: string;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AppStorageService {
  private firebaseAuthEventFired = false;
  private _fbUser: firebase.User = null;

  // {
  //   "display_name": null,
  //   "email": "test2@test.com",
  //   "eth_address": "|xxx|xxx",
  //   "phone_number": null,
  //   "tedn_public_key": "xSY0TNfyQYBNle9hdV05GNWZHnctOdzPFhNXyNlcB98"
  // }
  @LocalStorage() private _userInfo: AppStorageTypes.UserInfo = null;
  @LocalStorage() private insecureWallets = [];
  @LocalStorage() private _coinHDAddr = '';
  @LocalStorage()
  private _additionalInfo: AppStorageTypes.UserAdditionalInfo = {
    termsAndConditionsAllowed: false,
    privacyAllowed: false
  };

  tempPinNumber = '';

  private userStateSubscribers: Array<Subscriber<AppStorageTypes.User>> = [];
  private walletsSubscribers: Array<Subscriber<void>> = [];

  constructor(
    private logger: NGXLogger,
    private platform: Platform,
    private afAuth: AngularFireAuth,
    private appVersion: AppVersion,
    private store: LocalStorageService
  ) {}

  startFirebaseSigninCheck() {
    //listen firebase auth state
    const handler = (user: firebase.User) => {
      this.logger.debug('user state change');
      this.logger.debug('check current user');
      this.logger.debug(this.afAuth.auth.currentUser);

      const wasSignedIn = this.isSignedIn;
      this._fbUser = user;
      if (!this._fbUser) {
        this.userInfo = null;
      }

      const isFirstAuthCallback = this.firebaseAuthEventFired ? false : true;
      this.firebaseAuthEventFired = true;
      if (isFirstAuthCallback || this.isSignedIn !== wasSignedIn) {
        this.notifyToUserStateObservers();
      }
    };

    this.afAuth.user.subscribe(handler);
    //this.afAuth.authState.subscribe(handler);

    this.logger.debug('check current user');
    this.logger.debug(this.afAuth.auth.currentUser);
    //or use authState? 'this.afAuth.user' is faster one step.
    //this.afAuth.authState.subscribe((user: firebase.User) => {
  }

  wipeData() {
    //keep the pinnumber from wipe
    const pinNumber = this.pinNumber;
    this.store.clear();
    this.pinNumber = pinNumber;
  }

  get hasPinNumber(): boolean {
    if (!this.additionalInfo.pinNumber) {
      return false;
    }
    return true;
  }

  get additionalInfo(): AppStorageTypes.UserAdditionalInfo {
    if (!this._additionalInfo) {
      return {
        termsAndConditionsAllowed: false,
        privacyAllowed: false
      };
    }
    return this._additionalInfo;
  }

  set additionalInfo(val: AppStorageTypes.UserAdditionalInfo) {
    this._additionalInfo = val;
  }

  set pinNumber(val: string) {
    if (!val || val.length !== 6) {
      return;
    }
    const addtionalInfo = this.additionalInfo;
    addtionalInfo.pinNumber = val;
    this.additionalInfo = addtionalInfo;
  }

  get pinNumber(): string {
    return this.additionalInfo.pinNumber;
  }

  get isUserInfoValidated(): boolean {
    if (!this.isSignedIn) {
      return false;
    }

    if (env.config.signinWithEdnUserInfo) {
      if (!this.userInfo.display_name) {
        return false;
      }
    }
    return true;
  }

  set userInfo(info: AppStorageTypes.UserInfo) {
    const wasSignedIn = this.isSignedIn;
    this._userInfo = info;
    if (this.isSignedIn !== wasSignedIn) {
      this.notifyToUserStateObservers();
    }
  }

  get userInfo(): AppStorageTypes.UserInfo {
    return this._userInfo;
  }

  get fbUser(): firebase.User {
    return this._fbUser;
  }

  get user(): AppStorageTypes.User {
    if (this._fbUser) {
      return {
        fbUser: this._fbUser,
        userInfo: this.userInfo
      };
    }

    return null;
  }

  get userStateObserver(): Observable<AppStorageTypes.User> {
    const thisRef = this;

    return new Observable(observer => {
      listutil.addItemToList(thisRef.userStateSubscribers, observer);

      //observe first
      if (this.firebaseAuthEventFired) {
        observer.next(this.user);
      }

      // When the consumer unsubscribes, clean up data ready for next subscription.
      return {
        unsubscribe() {
          listutil.removeItemFromList(thisRef.userStateSubscribers, observer);
        }
      };
    });
  }

  get isSignedIn(): boolean {
    // if (this._fbUser) {
    if (env.config.signinWithEdnUserInfo) {
      if (this.fbUser && this.userInfo) {
        return true;
      }
    } else {
      if (this.fbUser) {
        return true;
      }
    }

    return false;
  }

  notifyToUserStateObservers() {
    this.logger.debug('notify user state change');
    listutil.notifyToObservers(this.userStateSubscribers, this.user);
  }

  private getExtractedUserEthAddresses(): Array<string> {
    if (!this.isSignedIn) {
      return [];
    }
    const result = [];
    this._userInfo.eth_address.split('|').forEach(item => {
      if (item.length > 0) {
        result.push(item);
      }
    });
    return result;
  }

  get coinHDAddress() {
    return this._coinHDAddr;
  }

  set coinHDAddress(val: string) {
    this._coinHDAddr = val;
  }

  /**
   * Wallet Features
   */
  get walletsObserver(): Observable<void> {
    const thisRef = this;

    return new Observable(observer => {
      listutil.addItemToList(thisRef.walletsSubscribers, observer);
      //observe first
      observer.next();

      // When the consumer unsubscribes, clean up data ready for next subscription.
      return {
        unsubscribe() {
          listutil.removeItemFromList(thisRef.walletsSubscribers, observer);
        }
      };
    });
  }

  /**
   * @param checkSignedIn return empty array with not signed in user
   * @param filteredWalletsByUserInfo filter by ethaddress in userInfo from edn server
   */
  getWallets(
    checkSignedIn = true,
    filteredWalletsByUserInfo = false
  ): Array<WalletTypes.WalletInfo> {
    if (checkSignedIn === true && !this.isSignedIn) {
      return [];
    }

    const result: Array<WalletTypes.WalletInfo> = [];
    if (filteredWalletsByUserInfo === false) {
      this.insecureWallets.forEach(item => {
        if (item.type === WalletTypes.WalletType.Ethereum) {
          result.push(item);
        }
      });
      return result;
    }

    const userEthAddressses = this.getExtractedUserEthAddresses();
    userEthAddressses.filter((val, idx) => {
      const foundStoredWallet = this.findWallet(
        WalletTypes.WalletType.Ethereum,
        val,
        EthProviders.Type.KnownNetwork,
        env.config.ednEthNetwork
      );
      if (foundStoredWallet) {
        result.push(foundStoredWallet);
      }
    });

    return result;
  }

  findWalletByInfo(
    walletInfo: WalletTypes.EthWalletInfo
  ): WalletTypes.WalletInfo | null {
    const provider = walletInfo.info.provider;
    return this.findWallet(
      walletInfo.type,
      walletInfo.address,
      provider.type,
      provider.connectionInfo
    );
  }

  syncDataToLocalStorage(wallet: WalletTypes.WalletInfo, notifyChange = false) {
    this.insecureWallets.forEach((item, index) => {
      if (item.id === wallet.id) {
        item.profile.alias = wallet.profile.alias;
        if (wallet.type === WalletTypes.WalletType.Ethereum) {
          item.info.contracts = wallet.info.contracts;
        }
      }
    });

    if (notifyChange) {
      listutil.notifyToObservers(this.walletsSubscribers);
    }
  }

  findWalletById(walletId: string): WalletTypes.WalletInfo | null {
    const foundStoredWallet = this.insecureWallets.find(
      (item: WalletTypes.WalletInfo) => {
        if (walletId === item.id) {
          return true;
        }
        return false;
      }
    );

    return foundStoredWallet;
  }

  findWallet(
    type: WalletTypes.WalletType,
    walletAddress: string,
    providerType: EthProviders.Type,
    providerConnectionInfo: string
  ): WalletTypes.EthWalletInfo | null {
    const foundStoredWallet = this.insecureWallets.find(
      (item: WalletTypes.WalletInfo) => {
        if (
          type === item.type &&
          walletAddress === item.address &&
          providerType === item.info.provider.type &&
          providerConnectionInfo === item.info.provider.connectionInfo
        ) {
          return true;
        }
        return false;
      }
    );

    return foundStoredWallet;
  }

  addWallet(walletInfo: WalletTypes.WalletInfo) {
    if (!this.findWalletByInfo(walletInfo)) {
      if (walletInfo.profile.order === null || walletInfo.profile.order < 0) {
        walletInfo.profile.order = this.getNewWalletOrderIndex();
      }
      if (!walletInfo.profile.alias) {
        walletInfo.profile.alias = this.getNewWalletAlias();
      }
      if (!walletInfo.profile.color) {
        walletInfo.profile.color = this.getNewWalletColor();
      }
      this.insecureWallets.push(walletInfo);
      listutil.notifyToObservers(this.walletsSubscribers);
    }
  }

  getNewWalletAlias(): string {
    let result = '';
    let num = 0;
    const wallets = this.insecureWallets;
    while (true) {
      num += 1;
      const alias = 'Wallet ' + num;
      const sameAliasWallet = wallets.find((item: WalletTypes.WalletInfo) => {
        if (item.profile.alias.trim() === alias) {
          return true;
        }
        return false;
      });
      if (!sameAliasWallet) {
        result = alias;
        break;
      }
    }

    return result;
  }

  getNewWalletOrderIndex(): number {
    return this.insecureWallets.length;
  }

  getColorPallete(): Array<string> {
    return [
      '#f6d9d9',
      '#cfe6f8',
      '#d9f2ca',
      '#98abec',
      '#cec29b',
      '#d2dad5',
      '#d7cdf8',
      '#c1d69d',
      '#bcc9f1',
      '#e6d3e0',
      '#98dcd5',
      '#92be9c',
      '#b9cfde',
      '#b8bddb',
      '#9da48b',
      '#e8e2c5',
      '#f3dce0',
      '#69f1e4'
    ];
  }

  getNewWalletColor(atIndex: number = null): string {
    const colors = this.getColorPallete();
    if (atIndex !== null && atIndex < colors.length) {
      return colors[atIndex];
    }
    const max = colors.length - 1;
    const min = 0;
    const randIdx = Math.floor(Math.random() * (max - min + 1)) + min;
    return colors[randIdx];
  }

  removeWallet(walletInfo: WalletTypes.WalletInfo) {
    if (this.findWalletByInfo(walletInfo)) {
      for (let i = 0; i < this.insecureWallets.length; i++) {
        const item: WalletTypes.WalletInfo = this.insecureWallets[i];
        if (
          walletInfo.type === item.type &&
          item.address === walletInfo.address
        ) {
          this.insecureWallets.splice(i, 1);
          listutil.notifyToObservers(this.walletsSubscribers);
          break;
        }
      }
    }
  }

  /** TEDN Features */
  getTednWallets(checkSignedIn = true): Array<AppStorageTypes.TednWalletInfo> {
    if (checkSignedIn === true && !this.isSignedIn) {
      return [];
    }

    const result: Array<AppStorageTypes.TednWalletInfo> = [];
    for (let i = 0; i < 1; i++) {
      result.push({
        id: Consts.TEDN_DEFAULT,
        name: 'Garden of Eden',
        color: this.getTednWalletColor(i)
      });
    }

    return result;
  }

  findTednWalletById(id): AppStorageTypes.TednWalletInfo {
    return this.getTednWallets(false).find(item => {
      if (item.id === id) {
        return true;
      }
    });
  }

  getTednWalletColor(atIndex: number = null): string {
    const colors = this.getColorPallete().reverse();
    if (atIndex !== null && atIndex < colors.length) {
      return colors[atIndex];
    }

    const max = colors.length - 1;
    const min = 0;
    const randIdx = Math.floor(Math.random() * (max - min + 1)) + min;
    return colors[randIdx];
  }

  /**
   * Local Transaction
   */
  getTxKey(walletInfo: WalletTypes.WalletInfo, pageIndex: number) {
    return 'tx_' + walletInfo.id + '_' + String(pageIndex);
  }

  getTxInfoKey(walletInfo: WalletTypes.WalletInfo) {
    return 'tx_info_' + walletInfo.id;
  }

  getTxInfo(walletInfo: WalletTypes.WalletInfo): AppStorageTypes.TxInfo {
    const key = this.getTxInfoKey(walletInfo);
    let info: AppStorageTypes.TxInfo = this.store.get(key);
    if (!info) {
      info = {
        startIndex: 0,
        endIndex: 0,
        incompleteSearchIndex: 0,
        countPerGroup: 2
      };
      this.store.set(key, info);
    }

    return info;
  }

  setTxInfo(walletInfo: WalletTypes.WalletInfo, info: AppStorageTypes.TxInfo) {
    this.store.set(this.getTxInfoKey(walletInfo), info);
  }

  addTx(
    type: AppStorageTypes.TxType,
    subType: AppStorageTypes.TxSubType,
    info: any,
    customData: any,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    state: AppStorageTypes.TxState,
    date: Date,
    data?: any
  ) {
    const txInfo: AppStorageTypes.TxInfo = this.getTxInfo(walletInfo);
    const txList = this.getTxListAtIndex(walletInfo, txInfo.endIndex);

    const txData: AppStorageTypes.TxRowData = {
      type: type,
      subType: subType,
      state: AppStorageTypes.TxRowState.Opened,
      hash: hash,
      info: info,
      logs: [],
      cDate: date.getTime(),
      mDate: date.getTime()
    };

    if (customData) {
      txData.customData = customData;
    }
    const txLog: AppStorageTypes.TxPartialLog = {
      state: state,
      date: date.getTime()
    };
    if (data) {
      txLog.data = data;
    }

    txData.logs.push(txLog);
    txList.push(txData);

    this.setTxList(walletInfo, txInfo.endIndex, txList);
    if (txList.length >= txInfo.countPerGroup) {
      txInfo.endIndex += 1;
      this.setTxInfo(walletInfo, txInfo);
      this.setTxList(walletInfo, txInfo.endIndex, []);
    }
  }

  addTxLog(
    rowState: AppStorageTypes.TxRowState,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    state: AppStorageTypes.TxState,
    date: Date,
    data?: any
  ): AppStorageTypes.TxRowData {
    let updatedRowData = null;

    const foundResult: {
      txRowData: AppStorageTypes.TxRowData;
      groupIndex: number;
      group: Array<AppStorageTypes.TxRowData>;
    } = this.findTx(walletInfo, hash, true);
    if (foundResult) {
      foundResult.txRowData.state = rowState;

      const txLog: AppStorageTypes.TxPartialLog = {
        state: state,
        date: date.getTime()
      };
      if (data) {
        txLog.data = data;
      }
      foundResult.txRowData.logs.push(txLog);
      foundResult.txRowData.mDate = date.getTime();

      this.setTxList(walletInfo, foundResult.groupIndex, foundResult.group);
      updatedRowData = foundResult.txRowData;
    }

    return updatedRowData;
  }

  updateTxCustomData(
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    customData?: any
  ) {
    const foundResult: {
      txRowData: AppStorageTypes.TxRowData;
      groupIndex: number;
      group: Array<AppStorageTypes.TxRowData>;
    } = this.findTx(walletInfo, hash, true);
    if (foundResult) {
      foundResult.txRowData.customData = customData;
      this.setTxList(walletInfo, foundResult.groupIndex, foundResult.group);
    }
  }

  findTx(
    walletInfo: WalletTypes.WalletInfo,
    txHash: string,
    sortByDesc: boolean
  ): {
    txRowData: AppStorageTypes.TxRowData;
    groupIndex: number;
    group: Array<AppStorageTypes.TxRowData>;
  } {
    const txInfo: AppStorageTypes.TxInfo = this.getTxInfo(walletInfo);

    let foundGroupIndex: number = null;
    let foundGroup: Array<AppStorageTypes.TxRowData> = null;
    let result: AppStorageTypes.TxRowData = null;

    const startIndex = txInfo.startIndex;
    const endIndex = txInfo.endIndex;
    if (sortByDesc) {
      for (let i = endIndex; i >= startIndex; i--) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        const foundTx = txGroup.find(item => {
          return item.hash === txHash;
        });

        if (foundTx) {
          foundGroupIndex = i;
          foundGroup = txGroup;
          result = foundTx;
          break;
        }
      }
    } else {
      for (let i = startIndex; i <= endIndex; i++) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        const foundTx = txGroup.find(item => {
          return item.hash === txHash;
        });

        if (foundTx) {
          foundGroupIndex = i;
          foundGroup = txGroup;
          result = foundTx;
          break;
        }
      }
    }

    if (foundGroup && result) {
      return {
        groupIndex: foundGroupIndex,
        group: foundGroup,
        txRowData: result
      };
    }

    return null;
  }

  findTxInList(
    txList: Array<AppStorageTypes.TxRowData>,
    txHash: string
  ): AppStorageTypes.TxRowData {
    return txList.find(item => {
      return item.hash === txHash;
    });
  }

  setTxList(
    walletInfo: WalletTypes.WalletInfo,
    groupIndex: number,
    list: Array<AppStorageTypes.TxRowData>
  ) {
    const txKey = this.getTxKey(walletInfo, groupIndex);
    this.logger.debug('save tx list at ' + groupIndex);
    this.logger.debug(list);
    this.store.set(txKey, list);
  }

  getTxListAtIndex(walletInfo: WalletTypes.WalletInfo, groupIndex: number) {
    const txKey = this.getTxKey(walletInfo, groupIndex);
    let txList: Array<AppStorageTypes.TxRowData> = this.store.get(txKey);
    if (!txList) {
      txList = [];
    }
    return txList;
  }

  getLastTxList(walletInfo: WalletTypes.WalletInfo) {
    const txInfo: AppStorageTypes.TxInfo = this.getTxInfo(walletInfo);
    const txKey = this.getTxKey(walletInfo, txInfo.endIndex);
    let txList: Array<AppStorageTypes.TxRowData> = this.store.get(txKey);
    if (!txList) {
      txList = [];
    }
    return txList;
  }

  getIncompleteTxList(
    walletInfo: WalletTypes.WalletInfo,
    listFilter?: (item: AppStorageTypes.TxRowData) => boolean
  ): Array<AppStorageTypes.TxRowData> {
    const txInfo: AppStorageTypes.TxInfo = this.getTxInfo(walletInfo);
    const txList = [];

    const limitIndex = txInfo.incompleteSearchIndex;
    const endIndex = txInfo.endIndex;

    for (let i = endIndex; i >= limitIndex; i--) {
      const txKey = this.getTxKey(walletInfo, i);
      const txGroup = this.store.get(txKey);
      if (txGroup === null || txGroup === undefined) {
        break;
      }

      for (let j = txGroup.length - 1; j >= 0; j--) {
        const item: AppStorageTypes.TxRowData = txGroup[j];
        if (
          item.state === AppStorageTypes.TxRowState.Opened ||
          (listFilter && listFilter(item) === true)
        ) {
          txList.push(item);
        }
      }
    }

    return txList;
  }

  getTxListForPaging(
    walletInfo: WalletTypes.WalletInfo,
    pageIndex: number,
    countPerPage: number,
    sortByDesc: boolean,
    listFilter?: (item: AppStorageTypes.TxRowData) => boolean
  ): Array<AppStorageTypes.TxRowData> {
    const txInfo: AppStorageTypes.TxInfo = this.getTxInfo(walletInfo);
    const txList = [];

    let passCount = pageIndex * countPerPage;

    const startIndex = txInfo.startIndex;
    const endIndex = txInfo.endIndex;
    if (sortByDesc) {
      for (let i = endIndex; i >= startIndex; i--) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        for (let j = txGroup.length - 1; j >= 0; j--) {
          if (passCount > 0) {
            passCount -= 1;
            continue;
          }

          const item = txGroup[j];
          if (listFilter) {
            if (listFilter(item)) {
              txList.push(item);
            }
          } else {
            txList.push(item);
          }
        }

        if (txList.length >= countPerPage) {
          break;
        }
      }
    } else {
      for (let i = startIndex; i <= endIndex; i++) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        for (let j = 0; j < txGroup.length; j++) {
          if (passCount > 0) {
            passCount -= 1;
            continue;
          }

          const item = txGroup[j];
          if (listFilter) {
            if (listFilter(item)) {
              txList.push(item);
            }
          } else {
            txList.push(item);
          }
        }

        if (txList.length >= countPerPage) {
          break;
        }
      }
    }

    return txList;
  }
}
