import { Injectable } from '@angular/core';
import { EthProviders } from './ether.service';
import { WalletTypes } from './wallet.service';
import { LocalStorageService, LocalStorage } from 'ngx-store';

class CommonABI {
  /**
   * see this
   * https://github.com/ethereum/wiki/wiki/Contract-ERC20-ABI
   */
  /*IgnoreMaxLengthLint*/
  static ERC20 = [
    {
      constant: true,
      inputs: [],
      name: 'name',
      outputs: [{ name: '', type: 'string' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        { name: '_spender', type: 'address' },
        { name: '_value', type: 'uint256' }
      ],
      name: 'approve',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        { name: '_from', type: 'address' },
        { name: '_to', type: 'address' },
        { name: '_value', type: 'uint256' }
      ],
      name: 'transferFrom',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'symbol',
      outputs: [{ name: '', type: 'string' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        { name: '_to', type: 'address' },
        { name: '_value', type: 'uint256' }
      ],
      name: 'transfer',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [
        { name: '_owner', type: 'address' },
        { name: '_spender', type: 'address' }
      ],
      name: 'allowance',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    { payable: true, stateMutability: 'payable', type: 'fallback' },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'owner', type: 'address' },
        { indexed: true, name: 'spender', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' }
      ],
      name: 'Approval',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' }
      ],
      name: 'Transfer',
      type: 'event'
    }
  ];

  /*--IgnoreMaxLengthLint*/
  static KyberNetworkProxy = [
    'function getExpectedRate(address src, address dest, uint srcQty) public view returns(uint expectedRate, uint slippageRate)',
    'function trade(address src, uint srcAmount, address dest, address destAddress, ' +
      'uint maxDestAmount, uint minConversionRate, address walletId) ' +
      'public payable returns(uint)',
    'function swapEtherToToken(address token, uint minConversionRate) public payable returns(uint)',
    'event ExecuteTrade(address indexed trader, address src, address dest, uint actualSrcAmount, uint actualDestAmount)'
  ];
  /*IgnoreMaxLengthLint--*/
}

// this property is temporary
// referenced from : https://developer.kyber.network/docs/MainnetEnvGuide/
const contractTable = {
  homestead: {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',

    kyberNetwork: '0x91a502C678605fbCe581eae053319747482276b9',
    KyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',

    EDN: '0x05860d453C7974CbF46508c06CBA14e211c629Ce',
    AST: '0x27054b13b1b798b345b591a4d22e6562d47ea75a'
  },
  ropsten: {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',

    kyberNetwork: '0x91a502C678605fbCe581eae053319747482276b9',
    KyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',

    EDN: '0x7dfc9ab6f39f2162c13acf660107203889c8113e',
    AST: '0xef06f410c26a0ff87b3a43927459cce99268a2ef'
  }
};

const ethErc20TokenContractTable: {
  [id: string]: { [id: string]: WalletTypes.ContractInfo };
} = {
  homestead: {
    EDN: {
      address: contractTable.homestead.EDN,
      type: WalletTypes.ContractType.ERC20,
      contractInfo: {
        name: 'Eden Coin',
        symbol: 'EDN',
        decimal: 18
      }
    },
    AST: {
      address: contractTable.homestead.AST,
      type: WalletTypes.ContractType.ERC20,
      contractInfo: {
        name: 'AirSwap',
        symbol: 'AST',
        decimal: 4
      }
    }
  },
  ropsten: {
    EDN: {
      address: contractTable.ropsten.EDN,
      type: WalletTypes.ContractType.ERC20,
      contractInfo: {
        name: 'EDN',
        symbol: 'EDN',
        decimal: 18
      }
    },
    AST: {
      address: contractTable.ropsten.AST,
      type: WalletTypes.ContractType.ERC20,
      contractInfo: {
        name: 'AirSwap',
        symbol: 'AST',
        decimal: 4
      }
    }
  }
};

const abiTable: object = {
  common: {
    ERC20: CommonABI.ERC20,
    KyberNetworkProxy: CommonABI.KyberNetworkProxy
  },
  homestead: {},
  ropsten: {}
};

const standardBIP39path = 'm/44\'/60\'/0\'/0/0';
const standardBIP39pathExcludingIndex = 'm/44\'/60\'/0\'/0/';

function resolveNetworkText(provider: EthProviders.Base | string) {
  let network = '';
  if (typeof provider === 'string') {
    network = provider;
  } else {
    network = provider.info.connectionInfo;
  }

  return network;
}

class ContractResolver {
  @LocalStorage() private _contractTable;
  @LocalStorage() private _contractInfoTable;

  getContractAddress(
    name: string,
    provider: EthProviders.Base | string
  ): string {
    const network = resolveNetworkText(provider);

    if (!this._contractTable) {
      this._contractTable = contractTable;
    }
    if (contractTable[network]) {
      const result = contractTable[network][name];
      if (result) {
        return result;
      }
    }

    return null;
  }

  getERC20ContractInfo(
    name: string,
    provider: EthProviders.Base | string
  ): WalletTypes.ContractInfo {
    const network = resolveNetworkText(provider);

    if (ethErc20TokenContractTable[network]) {
      const result = ethErc20TokenContractTable[network][name];
      if (result) {
        return result;
      }
    }

    return null;
  }

  getETH(provider: EthProviders.Base | string): string {
    return this.getContractAddress('ETH', provider);
  }

  getKyberNetworkProxy(provider: EthProviders.Base | string): string {
    return this.getContractAddress('KyberNetworkProxy', provider);
  }

  getEDN(provider: EthProviders.Base | string): string {
    return this.getContractAddress('EDN', provider);
  }
  getEDNContractInfo(
    provider: EthProviders.Base | string
  ): WalletTypes.ContractInfo {
    return this.getERC20ContractInfo('EDN', provider);
  }
}

class AbiResolver {
  getAbi(name: string, provider: EthProviders.Base | string): Array<any> {
    const network = resolveNetworkText(provider);
    if (abiTable[network]) {
      const result = abiTable[network][name];
      if (result) {
        return result;
      }
    }

    if (abiTable['common']) {
      const result = abiTable['common'][name];
      if (result) {
        return result;
      }
    }

    return null;
  }

  getERC20(provider: EthProviders.Base | string): Array<any> {
    return this.getAbi('ERC20', provider);
  }

  getKyberNetworkProxy(provider: EthProviders.Base | string): Array<any> {
    return this.getAbi('KyberNetworkProxy', provider);
  }
}

@Injectable({
  providedIn: 'root'
})
export class EtherDataService {
  constructor() {}

  contractResolver = new ContractResolver();
  abiResolver = new AbiResolver();

  getBIP39DerivationPath(index: string = '0'): string {
    return standardBIP39pathExcludingIndex + index;
  }
}
