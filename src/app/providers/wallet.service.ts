import { Injectable } from '@angular/core';
import { Provider } from 'ethers/providers';
import { ethers, Wallet } from 'ethers';
import { EthProviders } from './ether.service';


export enum ContractType {
    UNKNOWN = 'UNKNOWN',
    ERC20 = 'ERC20'
}

export interface ContractInfo {
    address: string;
    type: ContractType;

    // the contract data from network
    contractInfo?: {
        name: string,
        symbol: string,
        decimal: number
    };
}

export interface WalletInfo {
    id: string;
    address: string;
    info: {
      mnemonic?: string, path?: string,
      privateKey: string,
    };
    contracts: Array<ContractInfo>;
    provider: EthProviders.Info;
}

@Injectable({
    providedIn: 'root'
})
export class WalletService {
    constructor() {
    }

    toETHWallet() {

    }

    walletInstance(walletInfo: WalletInfo, provider: Provider): Wallet {
        return new ethers.Wallet(walletInfo.info.privateKey, provider);
    }
}
