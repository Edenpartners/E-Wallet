import { Injectable } from '@angular/core';
import { Provider } from 'ethers/providers';
import { ethers, Wallet } from 'ethers';
import { EthService, EthProviders } from './ether.service';
import { UUID } from 'angular2-uuid';
import { AppStorageService } from './appStorage.service';
import * as CryptoJS from 'crypto-js';
import { CryptoHelper } from '../utils/cryptoHelper';

import { env } from '../../environments/environment';
import { NGXLogger } from 'ngx-logger';

export namespace WalletTypes {
  export enum ContractType {
    UNKNOWN = 'UNKNOWN',
    ERC20 = 'ERC20'
  }

  export enum WalletType {
    Ethereum = 'Ethereum'
  }

  export interface ContractInfo {
    address: string;
    type: ContractType;

    // the contract data from network
    contractInfo?: {
      name: string;
      symbol: string;
      decimal: number;
    };
  }

  export interface WalletInfo {
    id: string;
    address: string;
    type: WalletType;

    profile: {
      alias: string | null;
      color: string | null;
      order: number | null;
    };
    info: any;
  }

  export interface EthWalletInfo extends WalletInfo {
    info: {
      data: {
        salt?: string;
        mnemonic?: string;
        path?: string;
        privateKey: string;
      };
      contracts: Array<ContractInfo>;
      provider: EthProviders.Info;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  constructor(private logger: NGXLogger, private eths: EthService) {}

  createEthWalletInstance(
    walletInfo: WalletTypes.EthWalletInfo,
    password: string
  ) {
    if (!password) {
      return null;
    }
    const ki = CryptoHelper.getKeyAndIV(password, walletInfo.info.data.salt);
    const decPrivateKey = CryptoJS.AES.decrypt(
      walletInfo.info.data.privateKey,
      ki.key,
      {
        iv: ki.iv
      }
    ).toString(CryptoJS.enc.Utf8);

    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );

    let result: Wallet = null;
    try {
      result = new ethers.Wallet(decPrivateKey, p.getEthersJSProvider());
    } catch (e) {
      this.logger.debug(e);
    }

    return result;
  }

  /**
   * @todo data encryption by password
   * @param password
   * @param mWords
   * @param path
   * @param providerType
   * @param connectionInfo
   */
  createEthWalletInfoToStore(
    mWords: string,
    path: string,
    providerType: EthProviders.Type,
    providerConnectionInfo: string,
    password: string
  ): WalletTypes.EthWalletInfo {
    if (!password) {
      return null;
    }

    let wallet = null;
    try {
      wallet = ethers.Wallet.fromMnemonic(mWords, path);
    } catch (e) {
      this.logger.debug(e);
    }

    if (!wallet) {
      return null;
    }

    const salt = CryptoHelper.createRandSalt();
    const ki = CryptoHelper.getKeyAndIV(password, salt);
    const encryptedMWords = CryptoJS.AES.encrypt(mWords, ki.key, {
      iv: ki.iv
    }).toString();
    const encryptedPath = CryptoJS.AES.encrypt(path, ki.key, {
      iv: ki.iv
    }).toString();
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      wallet.privateKey,
      ki.key,
      {
        iv: ki.iv
      }
    ).toString();

    const decKi = CryptoHelper.getKeyAndIV(password, salt);
    const decMWords = CryptoJS.AES.decrypt(encryptedMWords, decKi.key, {
      iv: decKi.iv
    }).toString(CryptoJS.enc.Utf8);
    const decPath = CryptoJS.AES.decrypt(encryptedPath, decKi.key, {
      iv: decKi.iv
    }).toString(CryptoJS.enc.Utf8);
    const decPrivateKey = CryptoJS.AES.decrypt(encryptedPrivateKey, decKi.key, {
      iv: decKi.iv
    }).toString(CryptoJS.enc.Utf8);

    this.logger.debug('ENC');
    this.logger.debug(encryptedMWords);
    this.logger.debug(encryptedPath);
    this.logger.debug(encryptedPrivateKey);
    this.logger.debug('DEC');
    this.logger.debug(decMWords);
    this.logger.debug(decPath);
    this.logger.debug(decPrivateKey);

    const result: WalletTypes.EthWalletInfo = {
      id: UUID.UUID(),
      address: wallet.address,
      type: WalletTypes.WalletType.Ethereum,
      profile: {
        alias: '',
        color: '',
        order: -1
      },

      info: {
        data: {
          salt: salt,
          mnemonic: encryptedMWords,
          path: encryptedPath,
          privateKey: encryptedPrivateKey
        },
        contracts: [],
        provider: {
          type: providerType,
          connectionInfo: providerConnectionInfo
        }
      }
    };

    return result;
  }
}
