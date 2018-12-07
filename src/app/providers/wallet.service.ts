import { Injectable } from '@angular/core';
import { Provider } from 'ethers/providers';
import { ethers, Wallet } from 'ethers';
import { EthProviders } from './ether.service';
import { UUID } from 'angular2-uuid';

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
  constructor() {}

  toETHWallet() {}

  walletInstance(
    walletInfo: WalletTypes.EthWalletInfo,
    provider: Provider
  ): Wallet {
    return new ethers.Wallet(walletInfo.info.data.privateKey, provider);
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
    mWords,
    path,
    providerType: EthProviders.Type,
    connectionInfo: string,
    password: string | null
  ): WalletTypes.EthWalletInfo {
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    const walletInfo: WalletTypes.EthWalletInfo = {
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
          mnemonic: mWords,
          path: path,
          privateKey: wallet.privateKey
        },
        contracts: [],
        provider: {
          type: providerType,
          connectionInfo: connectionInfo
        }
      }
    };

    return walletInfo;
  }
}
