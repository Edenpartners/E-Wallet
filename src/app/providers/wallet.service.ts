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
    info: {
      mnemonic?: string;
      path?: string;
      privateKey: string;
    };
    contracts: Array<ContractInfo>;
    provider: EthProviders.Info;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  constructor() {}

  toETHWallet() {}

  walletInstance(
    walletInfo: WalletTypes.WalletInfo,
    provider: Provider
  ): Wallet {
    return new ethers.Wallet(walletInfo.info.privateKey, provider);
  }

  /**
   * @todo data encryption by password
   * @param password
   * @param mWords
   * @param path
   * @param providerType
   * @param connectionInfo
   */
  createWalletInfoToStore(
    mWords,
    path,
    providerType: EthProviders.Type,
    connectionInfo: string,
    password: string | null
  ) {
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    const walletInfo: WalletTypes.WalletInfo = {
      id: UUID.UUID(),
      address: wallet.address,
      info: {
        mnemonic: mWords,
        path: path,
        privateKey: wallet.privateKey
      },
      contracts: [],
      provider: {
        type: providerType,
        connectionInfo: connectionInfo
      }
    };

    return walletInfo;
  }
}
