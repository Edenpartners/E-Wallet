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
import { Wallet } from 'ethers';
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

  export enum TxState {
    Created = 'Created',
    Receipted = 'Receipted'
  }

  export enum TxType {
    Default = 'Default',
    EthERC20Transfer = 'EthERC20Transfer'
  }

  export enum TxSubType {
    Send = 'Send',
    Receive = 'Receive'
  }

  export interface TxLog {
    state: TxState;
    date: number;
    data?: any;
  }

  export interface TxData {
    type: TxType;
    subType: TxSubType;
    hash: string;
    logs: Array<TxLog>;
    info: any;
    cDate: number;
    mDate: number;
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

    //this.afAuth.user.subscribe(handler);
    this.afAuth.authState.subscribe(handler);

    //or use authState? 'this.afAuth.user' is faster one step.
    //this.afAuth.authState.subscribe((user: firebase.User) => {
  }

  wipeData() {
    this.store.clear();
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

    // const additionalInfo = this.additionalInfo;
    // if (!additionalInfo.termsAndConditionsAllowed) {
    //   return false;
    // }
    // if (!additionalInfo.privacyAllowed) {
    //   return false;
    // }

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
    checkSignedIn,
    filteredWalletsByUserInfo
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
  getNewWalletColor(): string {
    const colors = ['#f6d9d9', '#cfe6f8', '#d9f2ca'];
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

  /**
   * Local Transaction
   */
  getTxKey(walletInfo: WalletTypes.WalletInfo) {
    return 'tx_' + walletInfo.id;
  }

  addTx(
    walletInfo: WalletTypes.WalletInfo,
    type: AppStorageTypes.TxType,
    subType: AppStorageTypes.TxSubType,
    hash: string,
    state: AppStorageTypes.TxState,
    date: Date,
    info: any,
    data?: any
  ) {
    const txList = this.getTxList(walletInfo);
    const txData: AppStorageTypes.TxData = {
      type: type,
      subType: subType,
      hash: hash,
      info: info,
      logs: [],
      cDate: date.getTime(),
      mDate: date.getTime()
    };
    const txLog: AppStorageTypes.TxLog = {
      state: state,
      date: date.getTime()
    };
    if (data) {
      txLog.data = data;
    }

    txData.logs.push(txLog);
    txList.push(txData);

    this.setTxList(walletInfo, txList);
  }

  addTxLog(
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    state: AppStorageTypes.TxState,
    date: Date,
    data?: any
  ) {
    const txList = this.getTxList(walletInfo);
    const txData: AppStorageTypes.TxData = this.findTxInList(
      txList,
      walletInfo,
      hash
    );

    if (txData) {
      const txLog: AppStorageTypes.TxLog = {
        state: state,
        date: date.getTime()
      };
      if (data) {
        txLog.data = data;
      }
      txData.logs.push(txLog);
      txData.mDate = date.getTime();
    }
    this.setTxList(walletInfo, txList);
  }

  findTx(
    walletInfo: WalletTypes.WalletInfo,
    txHash: string
  ): AppStorageTypes.TxData {
    const txList = this.getTxList(walletInfo);
    return txList.find(item => {
      return item.hash === txHash;
    });
  }

  findTxInList(
    txList: Array<AppStorageTypes.TxData>,
    walletInfo: WalletTypes.WalletInfo,
    txHash: string
  ): AppStorageTypes.TxData {
    return txList.find(item => {
      return item.hash === txHash;
    });
  }

  setTxList(
    walletInfo: WalletTypes.WalletInfo,
    list: Array<AppStorageTypes.TxData>
  ) {
    const key = this.getTxKey(walletInfo);
    this.store.set(key, list);
  }

  getTxList(
    walletInfo: WalletTypes.WalletInfo,
    listFilter?: (item: AppStorageTypes.TxData) => boolean,
    listSorter?: (
      a: AppStorageTypes.TxData,
      b: AppStorageTypes.TxData
    ) => number
  ): Array<AppStorageTypes.TxData> {
    const key = this.getTxKey(walletInfo);
    let txList: Array<AppStorageTypes.TxData> = this.store.get(key);
    if (!txList) {
      txList = [];
    }

    if (listFilter) {
      txList = txList.filter(listFilter);
    }

    if (listSorter) {
      txList.sort(listSorter);
    }

    return txList;
  }
}
