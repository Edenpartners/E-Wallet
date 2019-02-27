import { Injectable, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase';
import { Platform } from '@ionic/angular';
import { UUID } from 'angular2-uuid';

import { AppVersion } from '@ionic-native/app-version/ngx';
import { LocalStorageService, LocalStorage } from 'ngx-store';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { WalletTypes } from './wallet.service';
import { EthProviders } from '../providers/ether.service';
import { environment as env } from '../../environments/environment';
import { listutil, Map } from '../utils/listutil';
import { Consts } from 'src/environments/constants';
import * as CryptoJS from 'crypto-js';
import { CryptoHelper } from '../utils/cryptoHelper';
import { SQLite, SQLiteObject, DbTransaction } from '@ionic-native/sqlite/ngx';

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

  export interface TednWalletInfo {
    id: string;
    name: string;
    color: string;
  }

  export namespace Tx {
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
      KyberNetworkTrade = 'KyberNetworkTrade',
      IDEXTrade = 'IDEXTrade'
    }

    export enum TxSubType {
      Send = 'Send',
      Receive = 'Receive',
      Trade = 'Trade'
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
      customData?: string;
    }

    export interface TxPartialLog {
      state: TxState;
      date: number;
      data?: any;
    }

    export interface EthTxRowInfo {
      from: string;
      to: string;
      amount: {
        value: string;
        decimal: number;
        display: string;
      };
    }
  }
}

const LOG_COUNT_PER_GROUP = 30;

enum StoreKeys {
  _userInfo = '_userInfo',
  _wallets = '_wallets',
  _coinHDAddr = '_coinHDAddr',
  _additionalInfo = '_additionalInfo',
  pinCode = 'pin-code',
  salt = 'salt'
}

@Injectable({
  providedIn: 'root'
})
export class AppStorageService {
  private firebaseAuthEventFired = false;
  private _fbUser: firebase.User = null;
  private fbUserSubscription: Subscription = null;

  // {
  //   "display_name": null,
  //   "email": "test2@test.com",
  //   "eth_address": "|xxx|xxx",
  //   "phone_number": null,
  //   "tedn_public_key": "xSY0TNfyQYBNle9hdV05GNWZHnctOdzPFhNXyNlcB98"
  // }
  @LocalStorage() private _userInfo: AppStorageTypes.UserInfo = null;
  @LocalStorage() private _wallets = [];
  @LocalStorage() private _coinHDAddr = '';

  private userStateSubscribers: Array<Subscriber<AppStorageTypes.User>> = [];
  private walletsSubscribers: Array<Subscriber<void>> = [];
  private localStorageTxManager: LocalStorageTxManager = null;
  private sqliteTxManager: SqliteTxManager = null;

  constructor(
    private logger: NGXLogger,
    private platform: Platform,
    private afAuth: AngularFireAuth,
    private appVersion: AppVersion,
    private store: LocalStorageService,
    private sqlite: SQLite
  ) {
    this.localStorageTxManager = new LocalStorageTxManager(this.logger, this.store);
    this.sqliteTxManager = new SqliteTxManager(this.logger, this.platform, this.sqlite);
  }

  initSqlite() {
    this.sqliteTxManager.initDB();
  }

  startFirebaseSigninCheck() {
    this.logger.debug('start firebase signgin check');

    this.firebaseAuthEventFired = false;

    if (this.fbUserSubscription) {
      this.fbUserSubscription.unsubscribe();
      this.fbUserSubscription = null;
    }

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

    this.fbUserSubscription = this.afAuth.authState.subscribe(handler);

    //this.afAuth.authState.

    //this.afAuth.authState.subscribe(handler);
    //or use authState? 'this.afAuth.user' is faster one step.
    //this.afAuth.authState.subscribe((user: firebase.User) => {
  }

  wipeData() {
    this._userInfo = null;
    this.store.remove(StoreKeys._additionalInfo);

    if (env.config.clearPincodeOnWipeStorage) {
      this.store.remove(StoreKeys.pinCode);
      this.store.remove(StoreKeys.salt);
    }

    if (env.config.clearTxHistoryOnWipeStorage) {
      if (this._wallets) {
        // TODO : if to delete every tx history
        this._wallets.forEach(item => {});
      }
    }

    if (env.config.clearWalletsOnWipeStorage) {
      this._wallets = [];
    }
  }

  get hasPinNumber(): boolean {
    //null | undefined | empty
    if (!this.store.get(StoreKeys.pinCode)) {
      return false;
    }
    return true;
  }

  get additionalInfo(): AppStorageTypes.UserAdditionalInfo {
    const storedVal = this.store.get(StoreKeys._additionalInfo);

    if (!storedVal) {
      return {
        termsAndConditionsAllowed: false,
        privacyAllowed: false
      };
    }
    return storedVal;
  }

  set additionalInfo(val: AppStorageTypes.UserAdditionalInfo) {
    this.store.set(StoreKeys._additionalInfo, val);
  }

  setPinNumber(val: string, oldPincode: string): boolean {
    this.logger.debug('=============== SET PINNUMBER');

    if (oldPincode === null || oldPincode === undefined) {
      oldPincode = '';
    }

    if (!this.isValidPinNumber(oldPincode)) {
      this.logger.debug('CANCEL');
      return false;
    }

    const newSalt = this.randSalt();
    const mergedVal = newSalt + val;
    const hashedVal = CryptoJS.SHA256(mergedVal).toString(CryptoJS.enc.Base64);
    this.logger.debug(newSalt, val, hashedVal);

    let newPinCodeToSave = null;
    if (env.config.useDecryptPinCodeByPinCode) {
      newPinCodeToSave = CryptoJS.AES.encrypt(hashedVal, val).toString();
    } else {
      newPinCodeToSave = hashedVal;
    }

    const existingWallets = this.getWallets(false, false);
    if (existingWallets.length > 0) {
      const walletPw: string = this.getWalletPassword(oldPincode);
      this.logger.debug('wallet pw : ' + walletPw);

      if (walletPw !== null) {
        existingWallets.forEach((item: WalletTypes.WalletInfo) => {
          if (item.type === WalletTypes.WalletType.Ethereum) {
            const ethItem: WalletTypes.EthWalletInfo = item;

            const walletSalt = ethItem.info.data.salt;
            const decKi = CryptoHelper.getKeyAndIV(walletPw, walletSalt);
            const decMWords = CryptoJS.AES.decrypt(ethItem.info.data.mnemonic, decKi.key, {
              iv: decKi.iv
            }).toString(CryptoJS.enc.Utf8);
            const decPath = CryptoJS.AES.decrypt(ethItem.info.data.path, decKi.key, {
              iv: decKi.iv
            }).toString(CryptoJS.enc.Utf8);
            const decPrivateKey = CryptoJS.AES.decrypt(ethItem.info.data.privateKey, decKi.key, {
              iv: decKi.iv
            }).toString(CryptoJS.enc.Utf8);

            const newEthWalletSalt = CryptoHelper.createRandSalt();
            const newKi = CryptoHelper.getKeyAndIV(hashedVal, newEthWalletSalt);
            const encryptedMWords = CryptoJS.AES.encrypt(decMWords, newKi.key, {
              iv: newKi.iv
            }).toString();
            const encryptedPath = CryptoJS.AES.encrypt(decPath, newKi.key, {
              iv: newKi.iv
            }).toString();
            const encryptedPrivateKey = CryptoJS.AES.encrypt(decPrivateKey, newKi.key, {
              iv: newKi.iv
            }).toString();

            this.logger.debug('ENC');
            this.logger.debug(encryptedMWords);
            this.logger.debug(encryptedPath);
            this.logger.debug(encryptedPrivateKey);
            this.logger.debug('DEC');
            this.logger.debug(decMWords);
            this.logger.debug(decPath);
            this.logger.debug(decPrivateKey);

            ethItem.info.data.salt = newEthWalletSalt;
            ethItem.info.data.mnemonic = encryptedMWords;
            ethItem.info.data.path = encryptedPath;
            ethItem.info.data.privateKey = encryptedPrivateKey;
          }
        }); //end of foreach

        this.setWallets(existingWallets);
      }
    }

    this.salt = newSalt;
    this.store.set(StoreKeys.pinCode, newPinCodeToSave);
    return true;
  }

  isValidPinNumber(guessingPinCode: string): boolean {
    if (!guessingPinCode === null || !guessingPinCode === undefined) {
      return false;
    }

    this.logger.debug('is valid pin? : ' + guessingPinCode);

    let pinNumberToCompere = null;
    if (env.config.useDecryptPinCodeByPinCode) {
      const savingDecryptedHashedVal = this.getDecryptedPinNumber(guessingPinCode);
      pinNumberToCompere = savingDecryptedHashedVal;
    } else {
      const savedVal = this.pinNumber;
      this.logger.debug('saved val : ' + this.pinNumber);
      pinNumberToCompere = savedVal;
    }

    const salt = this.salt;
    const mergedVal = salt + guessingPinCode;
    const hashedVal = CryptoJS.SHA256(mergedVal).toString(CryptoJS.enc.Base64);

    this.logger.debug('is valid pin number?');
    this.logger.debug(salt, guessingPinCode, hashedVal);

    if (hashedVal === pinNumberToCompere) {
      this.logger.debug('this is valid number');
      return true;
    }

    return false;
  }

  getWalletPassword(guessingPinCode?: string, validate: boolean = false): string | null {
    let result = null;
    if (env.config.useDecryptPinCodeByPinCode) {
      if (guessingPinCode !== undefined && guessingPinCode !== null) {
        if (this.isValidPinNumber(guessingPinCode)) {
          result = this.getDecryptedPinNumber(guessingPinCode);
        }
      }
    } else {
      if (validate) {
        if (guessingPinCode !== undefined && guessingPinCode !== null && this.isValidPinNumber(guessingPinCode)) {
          result = this.pinNumber;
        }
      } else {
        result = this.pinNumber;
      }
    }
    return result;
  }

  getWalletPasswordWithValidate(guessingPinCode: string): string | null {
    return this.getWalletPassword(guessingPinCode, true);
  }

  getDecryptedPinNumber(guessingPinCode: string) {
    const savingEnctyptedVal = this.pinNumber;
    const savingDecryptedHashedVal = CryptoJS.AES.decrypt(savingEnctyptedVal, guessingPinCode).toString(CryptoJS.enc.Utf8);

    return savingDecryptedHashedVal;
  }

  get pinNumber(): string {
    let result = this.store.get(StoreKeys.pinCode);
    if (result === null || result === undefined) {
      const val = '';
      const newSalt = this.randSalt();
      const mergedVal = newSalt + val;
      const hashedVal = CryptoJS.SHA256(mergedVal).toString(CryptoJS.enc.Base64);

      let newPinCodeToSave = null;
      if (env.config.useDecryptPinCodeByPinCode) {
        newPinCodeToSave = CryptoJS.AES.encrypt(hashedVal, val).toString();
      } else {
        newPinCodeToSave = hashedVal;
      }
      this.logger.debug('make empty pinNumber : ' + newPinCodeToSave);
      this.internalPinNumber = newPinCodeToSave;
      this.salt = newSalt;
      result = newPinCodeToSave;
    }

    return result;
  }

  set internalPinNumber(val: string) {
    this.store.set(StoreKeys.pinCode, val);
  }

  randSalt(): string {
    return UUID.UUID();
  }

  get salt(): string {
    return this.store.get(StoreKeys.salt);
  }

  set salt(val: string) {
    this.store.set(StoreKeys.salt, val);
  }

  get isUserInfoValidated(): boolean {
    if (!this.isSignedIn) {
      return false;
    }

    if (env.config.signinWithEdnUserInfo) {
      if (!this.userInfo || !this.userInfo.display_name) {
        return false;
      }
    }
    return true;
  }

  get isUserEmailVerified(): boolean {
    if (!this.isSignedIn) {
      return false;
    }

    return this.fbUser.emailVerified;
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

  /**
   * an eth address will stay into userinfo until synchronize with server
   * @param address
   */
  addEthAddressToUserInfoTemporary(address: string) {
    const userInfo = this.userInfo;
    if (!userInfo) {
      return;
    }

    if (!userInfo.eth_address) {
      userInfo.eth_address = '';
    }

    let isAddressExists = false;
    userInfo.eth_address.split('|').forEach(item => {
      if (item.length > 0 && item.toLowerCase() === address.toLowerCase()) {
        isAddressExists = true;
      }
    });

    if (!isAddressExists) {
      userInfo.eth_address = this.userInfo.eth_address + '|' + address;
    }

    this.userInfo = userInfo;
  }

  removeEthAddressToUserInfoTemporary(address: string) {
    const userInfo = this.userInfo;
    if (!userInfo) {
      return;
    }

    if (!userInfo.eth_address) {
      userInfo.eth_address = '';
    }

    let newAddrs = userInfo.eth_address;
    userInfo.eth_address.split('|').forEach(item => {
      if (item.toLowerCase() !== address.toLowerCase()) {
        newAddrs += '|' + item;
      }
    });

    userInfo.eth_address = newAddrs;
    this.userInfo = userInfo;
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

  setWallets(wallets: Array<WalletTypes.WalletInfo>) {
    this._wallets = wallets;
  }

  /**
   *
   * @param checkSignedIn return empty array with not signed in user
   * @param filteredWalletsByUserInfo filter by ethaddress in userInfo from edn server
   */
  getWallets(checkSignedIn = true, filteredWalletsByUserInfo = false): Array<WalletTypes.WalletInfo> {
    if (checkSignedIn === true && !this.isSignedIn) {
      return [];
    }

    const result: Array<WalletTypes.WalletInfo> = [];
    const currentWallets = this._wallets;
    if (filteredWalletsByUserInfo === false && currentWallets) {
      currentWallets.forEach(item => {
        if (item.type === WalletTypes.WalletType.Ethereum) {
          result.push(item);
        }
      });
      return result;
    }

    const userEthAddressses = this.getExtractedUserEthAddresses();
    userEthAddressses.forEach(val => {
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

  findWalletByInfo(walletInfo: WalletTypes.EthWalletInfo): WalletTypes.WalletInfo | null {
    const provider = walletInfo.info.provider;
    return this.findWallet(walletInfo.type, walletInfo.address, provider.type, provider.connectionInfo);
  }

  syncDataToLocalStorage(wallet: WalletTypes.WalletInfo, notifyChange = false) {
    this._wallets.forEach((item, index) => {
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
    if (!this._wallets) {
      return null;
    }
    const foundStoredWallet = this._wallets.find((item: WalletTypes.WalletInfo) => {
      if (walletId === item.id) {
        return true;
      }
      return false;
    });

    return foundStoredWallet;
  }

  findWallet(
    type: WalletTypes.WalletType,
    walletAddress: string,
    providerType: EthProviders.Type,
    providerConnectionInfo: string
  ): WalletTypes.EthWalletInfo | null {
    if (!this._wallets) {
      return null;
    }
    const foundStoredWallet = this._wallets.find((item: WalletTypes.WalletInfo) => {
      if (
        type === item.type &&
        walletAddress.toLowerCase() === item.address.toLowerCase() &&
        providerType === item.info.provider.type &&
        providerConnectionInfo === item.info.provider.connectionInfo
      ) {
        return true;
      }
      return false;
    });

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

      this._wallets.push(walletInfo);
      listutil.notifyToObservers(this.walletsSubscribers);
    }
  }

  getNewWalletAlias(): string {
    let result = '';
    let num = 0;
    const wallets = this._wallets;
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
    return this._wallets.length;
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
      for (let i = 0; i < this._wallets.length; i++) {
        const item: WalletTypes.WalletInfo = this._wallets[i];
        if (walletInfo.type === item.type && item.address === walletInfo.address) {
          this._wallets.splice(i, 1);
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
        name: 'E-Garden',
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

  addTx(
    type: AppStorageTypes.Tx.TxType,
    subType: AppStorageTypes.Tx.TxSubType,
    info: any,
    customData: any,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ) {
    if (this.sqliteTxManager.isSupported()) {
      this.sqliteTxManager.addTx(type, subType, info, customData, walletInfo, hash, particialState, date, data);
    } else {
      this.localStorageTxManager.addTx(type, subType, info, customData, walletInfo, hash, particialState, date, data);
    }
  }

  addTxLog(
    rowState: AppStorageTypes.Tx.TxRowState,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ): Promise<AppStorageTypes.Tx.TxRowData> {
    if (this.sqliteTxManager.isSupported()) {
      return this.sqliteTxManager.addTxLog(rowState, walletInfo, hash, particialState, date, data);
    } else {
      return new Promise<AppStorageTypes.Tx.TxRowData>(async (finalResolve, finalReject) => {
        finalResolve(this.localStorageTxManager.addTxLog(rowState, walletInfo, hash, particialState, date, data));
      });
    }
  }

  updateTxCustomData(walletInfo: WalletTypes.WalletInfo, hash: string, customData?: string) {
    if (this.sqliteTxManager.isSupported()) {
      this.sqliteTxManager.updateTxCustomData(walletInfo, hash, customData);
    } else {
      this.localStorageTxManager.updateTxCustomData(walletInfo, hash, customData);
    }
  }

  getIncompleteTxList(walletInfo: WalletTypes.WalletInfo, customDataFilter?: string): Promise<Array<AppStorageTypes.Tx.TxRowData>> {
    if (this.sqliteTxManager.isSupported()) {
      return this.sqliteTxManager.getIncompleteTxList(walletInfo, customDataFilter);
    } else {
      return new Promise<Array<AppStorageTypes.Tx.TxRowData>>(async (finalResolve, finalReject) => {
        finalResolve(this.localStorageTxManager.getIncompleteTxList(walletInfo, customDataFilter));
      });
    }
  }

  getTxListForPaging(
    walletInfo: WalletTypes.WalletInfo,
    pageIndex: number,
    countPerPage: number,
    sortByDesc: boolean,
    stateFilter?: AppStorageTypes.Tx.TxRowState
  ): Promise<Array<AppStorageTypes.Tx.TxRowData>> {
    if (this.sqliteTxManager.isSupported()) {
      return this.sqliteTxManager.getTxListForPaging(walletInfo, pageIndex, countPerPage, sortByDesc, stateFilter);
    } else {
      return new Promise<Array<AppStorageTypes.Tx.TxRowData>>(async (finalResolve, finalReject) => {
        finalResolve(this.localStorageTxManager.getTxListForPaging(walletInfo, pageIndex, countPerPage, sortByDesc, stateFilter));
      });
    }
  }
}

class SqliteTxManager {
  constructor(private logger: NGXLogger, private platform: Platform, private sqlite: SQLite) {}
  db: SQLiteObject = null;

  isSupported(): boolean {
    if (this.platform.is('cordova') && (this.platform.is('ios') || this.platform.is('android'))) {
      return true;
    }
    return false;
  }

  isRunnable(): boolean {
    if (this.isSupported()) {
      if (this.db) {
        return true;
      }
    }

    return false;
  }

  initDB() {
    if (!this.isSupported()) {
      return;
    }

    this.sqlite
      .create({
        name: 'txdata.db',
        location: 'default'
      })
      .then((txDb: SQLiteObject) => {
        this.db = txDb;
        this.createTable();
      });
  }

  createTable() {
    if (!this.db) {
      return;
    }

    this.db.transaction((tx: DbTransaction) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS Tx (walletId TEXT, type TEXT, subType TEXT, state TEXT, ' +
          'hash TEXT, logs TEXT, info TEXT, cDate INT, mDate INT, customData TEXT)'
      );
    });
  }

  addTx(
    type: AppStorageTypes.Tx.TxType,
    subType: AppStorageTypes.Tx.TxSubType,
    info: any,
    customData: any,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ) {
    const txData: AppStorageTypes.Tx.TxRowData = {
      type: type,
      subType: subType,
      state: AppStorageTypes.Tx.TxRowState.Opened,
      hash: hash,
      info: info,
      logs: [],
      cDate: date.getTime(),
      mDate: date.getTime()
    };

    if (customData) {
      txData.customData = customData;
    } else {
      txData.customData = '';
    }

    const txLog: AppStorageTypes.Tx.TxPartialLog = {
      state: particialState,
      date: date.getTime()
    };

    if (data) {
      txLog.data = data;
    }

    txData.logs.push(txLog);

    const logger = this.logger;

    this.db.transaction((tx: DbTransaction) => {
      //(walletId TEXT, type TEXT, subType TEXT, state TEXT, ' +
      //'hash TEXT, logs TEXT, info TEXT, cDate INT, mDate INT, customData TEXT)'

      const infoText = JSON.stringify(txData.info);
      const logsText = JSON.stringify(txData.logs);

      tx.executeSql(
        `INSERT INTO Tx VALUES('${walletInfo.id}','${txData.type}','${txData.subType}',` +
          `'${txData.state}','${txData.hash}','${logsText}','${infoText}',${txData.cDate},${txData.mDate},'${txData.customData}')`,
        [],
        () => {
          logger.debug('success');
        },
        err => {
          logger.debug('failed', err);
        }
      );
    });
  }

  findTx(walletInfo: WalletTypes.WalletInfo, txHash: string): Promise<AppStorageTypes.Tx.TxRowData> {
    const logger = this.logger;

    return new Promise<AppStorageTypes.Tx.TxRowData>(async (finalResolve, finalReject) => {
      this.db.transaction((dbTx: DbTransaction) => {
        //(walletId TEXT, type TEXT, subType TEXT, state TEXT, ' +
        //'hash TEXT, logs TEXT, info TEXT, cDate INT, mDate INT, customData TEXT)'
        dbTx.executeSql(
          `SELECT * FROM Tx WHERE walletId = '${walletInfo.id}' AND hash = '${txHash}'`,
          [],
          (_dbTx, rs) => {
            logger.debug('dbtx', _dbTx);
            logger.debug('dbrs', rs);
            const resultList = this.convertDBItemsToTxList(rs.rows);
            if (resultList.length > 0) {
              finalResolve(resultList[0]);
            } else {
              finalResolve(null);
            }
          },
          error => {
            finalReject(error);
          }
        );
      });
    });
  }

  private convertDBItemsToTxList(dbRows): Array<AppStorageTypes.Tx.TxRowData> {
    const result: Array<AppStorageTypes.Tx.TxRowData> = [];
    for (let i = 0; i < dbRows.length; i++) {
      const rowItem = dbRows.item(i);
      result.push(this.convertDBItemToTx(rowItem));
    }
    return result;
  }

  private convertDBItemToTx(dbItem): AppStorageTypes.Tx.TxRowData {
    const result: AppStorageTypes.Tx.TxRowData = {
      type: dbItem.type,
      subType: dbItem.subType,
      state: dbItem.state,
      hash: dbItem.hash,
      info: null,
      logs: null,
      cDate: dbItem.cDate,
      mDate: dbItem.mDate,
      customData: dbItem.customData
    };

    result.info = JSON.parse(dbItem.info);
    result.logs = JSON.parse(dbItem.logs);

    return result;
  }

  updateTxRow(walletInfo: WalletTypes.WalletInfo, txRow: AppStorageTypes.Tx.TxRowData): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      const infoText = JSON.stringify(txRow.info);
      const logsText = JSON.stringify(txRow.logs);

      this.db.transaction((dbTx: DbTransaction) => {
        dbTx.executeSql(
          `UPDATE Tx SET type = '${txRow.type}', subType = '${txRow.subType}', state = '${txRow.state}', hash = '${txRow.hash}'` +
            `, logs = '${logsText}', info = '${infoText}', cDate = ${txRow.cDate}, mDate = ${txRow.mDate}` +
            `, customData = '${txRow.customData}' WHERE walletId = '${walletInfo.id}' AND hash = '${txRow.hash}'`,
          [],
          _dbTx => {
            finalResolve();
            this.logger.debug('success');
          },
          err => {
            finalReject(err);
            this.logger.debug('failed', err);
          }
        );
      });
    });
  }

  addTxLog(
    rowState: AppStorageTypes.Tx.TxRowState,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ): Promise<AppStorageTypes.Tx.TxRowData> {
    return new Promise<AppStorageTypes.Tx.TxRowData>(async (finalResolve, finalReject) => {
      const foundTx = await this.findTx(walletInfo, hash);
      if (foundTx) {
        const txLog: AppStorageTypes.Tx.TxPartialLog = {
          state: particialState,
          date: date.getTime()
        };
        if (data) {
          txLog.data = data;
        }

        foundTx.state = rowState;
        foundTx.logs.push(txLog);
        foundTx.mDate = date.getTime();

        this.updateTxRow(walletInfo, foundTx).then(
          () => {
            finalResolve(foundTx);
          },
          error => {
            finalReject(error);
          }
        );
      } else {
        finalResolve(null);
      }
    });
  }

  updateTxCustomData(walletInfo: WalletTypes.WalletInfo, hash: string, customData?: string) {
    return new Promise<AppStorageTypes.Tx.TxRowData>(async (finalResolve, finalReject) => {
      const foundTx = await this.findTx(walletInfo, hash);
      if (foundTx) {
        foundTx.customData = customData;

        this.updateTxRow(walletInfo, foundTx).then(
          () => {
            finalResolve(foundTx);
          },
          error => {
            finalReject(error);
          }
        );
      } else {
        finalResolve(null);
      }
    });
  }

  getIncompleteTxList(walletInfo: WalletTypes.WalletInfo, customDataFilter?: string): Promise<Array<AppStorageTypes.Tx.TxRowData>> {
    const logger = this.logger;

    return new Promise<Array<AppStorageTypes.Tx.TxRowData>>(async (finalResolve, finalReject) => {
      this.db.transaction((dbTx: DbTransaction) => {
        let customDataCondition = '';
        if (customDataFilter) {
          customDataCondition = `OR customData = '${customDataFilter}'`;
        }
        dbTx.executeSql(
          `SELECT * FROM Tx WHERE walletId = '${walletInfo.id}' AND ` +
            `(state = '${AppStorageTypes.Tx.TxRowState.Opened}' ${customDataCondition})`,
          [],
          (_dbTx, rs) => {
            logger.debug('dbtx', _dbTx);
            logger.debug('dbrs', rs);
            const resultList = this.convertDBItemsToTxList(rs.rows);

            logger.debug('incomplete tx list : ', resultList);
            finalResolve(resultList);
          },
          error => {
            finalReject(error);
          }
        );
      });
    });
  }

  getTxListForPaging(
    walletInfo: WalletTypes.WalletInfo,
    pageIndex: number,
    countPerPage: number,
    sortByDesc: boolean,
    stateFilter?: AppStorageTypes.Tx.TxRowState
  ): Promise<Array<AppStorageTypes.Tx.TxRowData>> {
    const logger = this.logger;
    const passCount = pageIndex * countPerPage;

    return new Promise<Array<AppStorageTypes.Tx.TxRowData>>(async (finalResolve, finalReject) => {
      this.db.transaction((dbTx: DbTransaction) => {
        const orderBy = sortByDesc ? 'DESC' : 'ASC';
        let whereStatement = '';
        if (stateFilter) {
          whereStatement = `AND state = '${stateFilter}'`;
        }

        dbTx.executeSql(
          `SELECT * FROM Tx WHERE walletId = '${
            walletInfo.id
          }' ${whereStatement} ORDER BY cDate ${orderBy} LIMIT ${countPerPage} OFFSET ${passCount}`,
          [],
          (_dbTx, rs) => {
            logger.debug('dbtx', _dbTx);
            logger.debug('dbrs', rs);
            const resultList = this.convertDBItemsToTxList(rs.rows);
            logger.debug('txlist for paging : ', resultList);
            finalResolve(resultList);
          },
          error => {
            finalReject(error);
          }
        );
      });
    });
  }
}

class LocalStorageTxManager {
  constructor(private logger: NGXLogger, private store: LocalStorageService) {}

  /**
   * Local Transaction
   */
  getTxKey(walletInfo: WalletTypes.WalletInfo, pageIndex: number) {
    return 'tx_' + walletInfo.id + '_' + String(pageIndex);
  }

  getTxInfoKey(walletInfo: WalletTypes.WalletInfo) {
    return 'tx_info_' + walletInfo.id;
  }

  getTxInfo(walletInfo: WalletTypes.WalletInfo): AppStorageTypes.Tx.TxInfo {
    const key = this.getTxInfoKey(walletInfo);
    let info: AppStorageTypes.Tx.TxInfo = this.store.get(key);
    if (!info) {
      info = {
        startIndex: 0,
        endIndex: 0,
        incompleteSearchIndex: 0,
        countPerGroup: LOG_COUNT_PER_GROUP
      };
      this.store.set(key, info);
    }

    return info;
  }

  setTxInfo(walletInfo: WalletTypes.WalletInfo, info: AppStorageTypes.Tx.TxInfo) {
    this.store.set(this.getTxInfoKey(walletInfo), info);
  }

  addTx(
    type: AppStorageTypes.Tx.TxType,
    subType: AppStorageTypes.Tx.TxSubType,
    info: any,
    customData: any,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ) {
    const txInfo: AppStorageTypes.Tx.TxInfo = this.getTxInfo(walletInfo);
    const txList = this.getTxListAtIndex(walletInfo, txInfo.endIndex);

    const txData: AppStorageTypes.Tx.TxRowData = {
      type: type,
      subType: subType,
      state: AppStorageTypes.Tx.TxRowState.Opened,
      hash: hash,
      info: info,
      logs: [],
      cDate: date.getTime(),
      mDate: date.getTime()
    };

    if (customData) {
      txData.customData = customData;
    }

    const txLog: AppStorageTypes.Tx.TxPartialLog = {
      state: particialState,
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
    rowState: AppStorageTypes.Tx.TxRowState,
    walletInfo: WalletTypes.WalletInfo,
    hash: string,
    particialState: AppStorageTypes.Tx.TxState,
    date: Date,
    data?: any
  ): AppStorageTypes.Tx.TxRowData {
    let updatedRowData = null;

    const foundResult: {
      txRowData: AppStorageTypes.Tx.TxRowData;
      groupIndex: number;
      group: Array<AppStorageTypes.Tx.TxRowData>;
    } = this.findTx(walletInfo, hash, true);

    if (foundResult) {
      foundResult.txRowData.state = rowState;

      const txLog: AppStorageTypes.Tx.TxPartialLog = {
        state: particialState,
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

  updateTxCustomData(walletInfo: WalletTypes.WalletInfo, hash: string, customData?: string) {
    const foundResult: {
      txRowData: AppStorageTypes.Tx.TxRowData;
      groupIndex: number;
      group: Array<AppStorageTypes.Tx.TxRowData>;
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
    txRowData: AppStorageTypes.Tx.TxRowData;
    groupIndex: number;
    group: Array<AppStorageTypes.Tx.TxRowData>;
  } {
    const txInfo: AppStorageTypes.Tx.TxInfo = this.getTxInfo(walletInfo);

    let foundGroupIndex: number = null;
    let foundGroup: Array<AppStorageTypes.Tx.TxRowData> = null;
    let result: AppStorageTypes.Tx.TxRowData = null;

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

  findTxInList(txList: Array<AppStorageTypes.Tx.TxRowData>, txHash: string): AppStorageTypes.Tx.TxRowData {
    return txList.find(item => {
      return item.hash === txHash;
    });
  }

  setTxList(walletInfo: WalletTypes.WalletInfo, groupIndex: number, list: Array<AppStorageTypes.Tx.TxRowData>) {
    const txKey = this.getTxKey(walletInfo, groupIndex);
    this.logger.debug('save tx list at ' + groupIndex);
    this.logger.debug(list);
    this.store.set(txKey, list);
  }

  getTxListAtIndex(walletInfo: WalletTypes.WalletInfo, groupIndex: number) {
    const txKey = this.getTxKey(walletInfo, groupIndex);
    let txList: Array<AppStorageTypes.Tx.TxRowData> = this.store.get(txKey);
    if (!txList) {
      txList = [];
    }
    return txList;
  }

  getLastTxList(walletInfo: WalletTypes.WalletInfo) {
    const txInfo: AppStorageTypes.Tx.TxInfo = this.getTxInfo(walletInfo);
    const txKey = this.getTxKey(walletInfo, txInfo.endIndex);
    let txList: Array<AppStorageTypes.Tx.TxRowData> = this.store.get(txKey);
    if (!txList) {
      txList = [];
    }
    return txList;
  }

  getIncompleteTxList(walletInfo: WalletTypes.WalletInfo, customDataFilter?: string): Array<AppStorageTypes.Tx.TxRowData> {
    const txInfo: AppStorageTypes.Tx.TxInfo = this.getTxInfo(walletInfo);
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
        const item: AppStorageTypes.Tx.TxRowData = txGroup[j];
        if (item.state === AppStorageTypes.Tx.TxRowState.Opened || item.customData === customDataFilter) {
          txList.push(item);
        }
      }
    }

    //update search limit if empty array
    if (txList.length === 0) {
      if (txInfo.incompleteSearchIndex !== txInfo.endIndex) {
        txInfo.incompleteSearchIndex = txInfo.endIndex;
        this.setTxInfo(walletInfo, txInfo);
      }
    }

    return txList;
  }

  getTxListForPaging(
    walletInfo: WalletTypes.WalletInfo,
    pageIndex: number,
    countPerPage: number,
    sortByDesc: boolean,
    stateFilter?: AppStorageTypes.Tx.TxRowState
  ): Array<AppStorageTypes.Tx.TxRowData> {
    const txInfo: AppStorageTypes.Tx.TxInfo = this.getTxInfo(walletInfo);
    const txList = [];

    let passCount = pageIndex * countPerPage;

    const startIndex = txInfo.startIndex;
    const endIndex = txInfo.endIndex;
    if (sortByDesc) {
      for (let i = endIndex; i >= startIndex; i--) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup: Array<AppStorageTypes.Tx.TxRowData> = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        for (let j = txGroup.length - 1; j >= 0; j--) {
          const item = txGroup[j];
          let addToList = false;

          if (stateFilter) {
            if (item.state === stateFilter) {
              addToList = true;
            }
          } else {
            addToList = true;
          }

          if (addToList) {
            if (passCount > 0) {
              passCount -= 1;
              continue;
            } else {
              txList.push(item);
            }
          }
        }

        if (txList.length >= countPerPage) {
          break;
        }
      }
    } else {
      for (let i = startIndex; i <= endIndex; i++) {
        const txKey = this.getTxKey(walletInfo, i);
        const txGroup: Array<AppStorageTypes.Tx.TxRowData> = this.store.get(txKey);
        if (txGroup === null || txGroup === undefined) {
          break;
        }

        for (let j = 0; j < txGroup.length; j++) {
          let addToList = false;

          const item = txGroup[j];
          if (stateFilter) {
            if (item.state === stateFilter) {
              addToList = true;
            }
          } else {
            addToList = true;
          }

          if (addToList) {
            if (passCount > 0) {
              passCount -= 1;
              continue;
            } else {
              txList.push(item);
            }
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
