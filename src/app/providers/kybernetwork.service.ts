
// See this
// https://developer.kyber.network/docs

// WEB API
// ============================================
// https://developer.kyber.network/docs/TrackerAPIGuide/#price-and-volume-information
// Supported Tokens - Mainnet : https://tracker.kyber.network/api/tokens/supported
// Supported Tokens - Ropsten : https://tracker.kyber.network/api/tokens/supported?chain=ropsten

// Pairs ETH - Tokens ( Only mainnet Supported )
// https://tracker.kyber.network/api/tokens/pairs
// ====================================================


// Contracts
// ============================================
// Smart Contracts Information
// https://developer.kyber.network/docs/KyberNetworkProxy/#trade
// https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol

// Contract Addresses - Mainnet
// https://developer.kyber.network/docs/MainnetEnvGuide/

// Contract Addresses - Ropsten
// https://developer.kyber.network/docs/RopstenEnvGuide/
// =======================================================


// Trade Guide
// ============================================
// https://developer.kyber.network/docs/WalletsGuide/
//
// let networkEnabled = await KyberNetworkProxyContract.methods.enabled().call()
//
// https://developer.kyber.network/docs/CodesAppendix/#broadcasting-transactions
// ============================================

// ABI
// ============================================
// https://developer.kyber.network/docs/KyberNetworkProxyInterface/

// Get KyberNetworkProxy ABI for Mainnet : https://etherscan.io/address/0x818E6FECD516Ecc3849DAf6845e3EC868087B755#code
// Get KyberNetworkProxy ABI for Ropsten : https://ropsten.etherscan.io/address/0x818E6FECD516Ecc3849DAf6845e3EC868087B755#code
// ============================================


// Kyber Swap
// ============================================
// https://kyber.network/swap/eth_knc
// https://ropsten.kyber.network/swap/eth_knc
// ============================================

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class KyberNetworkService {
    constructor() { }
}
