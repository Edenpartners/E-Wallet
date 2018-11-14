import { Injectable } from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { EtherDataService } from './etherData.service';
import {
  WalletService,
  ContractInfo,
  ContractType,
  WalletInfo
} from './wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from './kybernetwork.service';
import { Provider } from 'ethers/providers';
import { BigNumber } from 'ethers/utils';

@Injectable({
  providedIn: 'root'
})
export class EdnWalletApiService {
  constructor(
    public eths: EthService,
    private logger: NGXLogger,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherData: EtherDataService
  ) {}

  async getERC20TokenInfo(
    walletInfo: WalletInfo,
    ctInfo: ContractInfo
  ): Promise < any > {
    if (ctInfo.type !== ContractType.ERC20) {
      this.logger.debug('this is not an ERC-20 Token');
    }

    const p: EthProviders.Base = this.eths.getProvider(walletInfo.provider);
    const w: Wallet = this.walletService.walletInstance(
      walletInfo,
      p.getEthersJSProvider()
    );

    // this.abiStorage.etherERC20
    // last argument as provider = readonly but wallet = r/w
    // https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917
    // https://docs.ethers.io/ethers.js/html/api-contract.html#contract-abi
    const erc20Abi = this.etherData.abiResolver.getERC20(p.info.connectionInfo);
    const contract = new Contract(
      ctInfo.address,
      erc20Abi,
      p.getEthersJSProvider()
    );

    const logger = this.logger;

    const getInfoPromise = new Promise(async (resolve, reject) => {
      // Listen ERC-20 : Get Information
      const tokenName = await contract.name();
      logger.debug('got token name : ' + tokenName);
      const tokenSymbol = await contract.symbol();
      logger.debug('got token symbol : ' + tokenSymbol);
      const decimal = await contract.decimals();
      logger.debug('got decimal : ' + decimal);

      const balanceOfAddress = await contract.balanceOf(walletInfo.address);
      const adjustedBalance = balanceOfAddress / Math.pow(10, decimal);
      logger.debug(
        'got balance : ' + balanceOfAddress + ' -> ' + adjustedBalance
      );

      const result = {
        name: tokenName,
        symbol: tokenSymbol,
        decimal: decimal
      };
      resolve(result);
    });

    return getInfoPromise;
  }

  async getERC20TokenBalance(
    walletInfo: WalletInfo,
    ctInfo: ContractInfo
  ): Promise < any > {
    if (ctInfo.type !== ContractType.ERC20) {
      this.logger.debug('this is not an ERC-20 Token');
    }

    const p: EthProviders.Base = this.eths.getProvider(walletInfo.provider);
    const w: Wallet = this.walletService.walletInstance(
      walletInfo,
      p.getEthersJSProvider()
    );

    // this.abiStorage.etherERC20
    // last argument as provider = readonly but wallet = r/w
    // https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917
    // https://docs.ethers.io/ethers.js/html/api-contract.html#contract-abi
    const erc20Abi = this.etherData.abiResolver.getERC20(p.info.connectionInfo);
    const contract = new Contract(
      ctInfo.address,
      erc20Abi,
      p.getEthersJSProvider()
    );

    const logger = this.logger;

    const getInfoPromise = new Promise(async (resolve, reject) => {
      const decimal = await contract.decimals();
      logger.debug('got decimal : ' + decimal);
      const balanceBn: BigNumber = await contract.balanceOf(walletInfo.address);
      const adjustedBalanceBn = balanceBn.div(ethers.utils.bigNumberify(10).pow(decimal));
      logger.debug(
        'got balance : ' + balanceBn + ' -> ' + adjustedBalanceBn
      );

      const result = {
        balance: balanceBn,
        adjustedBalance: adjustedBalanceBn
      };
      resolve(result);
    });

    return getInfoPromise;
  }
}