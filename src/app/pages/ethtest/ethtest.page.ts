import { Component, OnInit, Inject } from '@angular/core';
import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval } from 'rxjs';
import { EtherDataService } from '../../providers/etherData.service';
import { WalletService, ContractInfo, ContractType, WalletInfo } from '../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../providers/kybernetwork.service';
import { EtherApiService } from '../../providers/etherApi.service';

interface WalletRow {
  /** just index */
  id: number;
  data: WalletInfo;
  contractsExpanded: boolean;
  transactionsExpanded: boolean;
  ethBalanceWei: BigNumber;
  ethBalanceEther: string;
  etherBalanceGetter: any;
  deleted: boolean;

  transactionHistory: Array < any > ;

  extraData: {
    selectedContractType: ContractType.UNKNOWN,
    contractAddressToAdd: ''
  };

  contractWorkers: Array < ContractWorker > ;
}

interface ContractWorker {
  id: string;
  balance: BigNumber;
  adjustedBalance: BigNumber;
}

@Component({
  selector: 'app-ethtest',
  templateUrl: './ethtest.page.html',
  styleUrls: ['./ethtest.page.scss']
})
export class EthtestPage implements OnInit {

  title = '';
  currentNum = 0;
  mnemonicWords = '';

  wallets: Array < WalletRow > = [];
  selectedWallet: WalletRow = null;

  @LocalStorage() insecureWallets = [];
  @LocalStorage() viewCounts = 0;

  restoreWalletIndex = 0;

  supportedContracts: Array < ContractType > = [ContractType.UNKNOWN, ContractType.ERC20];
  supportedProviderTypes: Array < EthProviders.Type > = [EthProviders.Type.KnownNetwork,
    EthProviders.Type.JsonRpc
  ];
  supportedKnownNetworks: Array < EthProviders.KnownNetworkType > = [EthProviders.KnownNetworkType.homestead,
    EthProviders.KnownNetworkType.ropsten
  ];

  selectedWalletProviderType: EthProviders.Type = EthProviders.Type.KnownNetwork;
  selectedWalletConnectionInfo: string = EthProviders.KnownNetworkType.homestead;

  constructor(
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherApi: EtherApiService) {}

  ngOnInit() {
    this.refreshList();
  }

  resolveProvider(walletRow: WalletRow): EthProviders.Base {
    return this.eths.getProvider(walletRow.data.provider);
  }

  wipeData() {
    this.store.clear();
    window.location.reload();
  }

  generateRandomMnemonic() {
    this.mnemonicWords = ethers.Wallet.createRandom().mnemonic;
  }

  onWalletProviderTypeChange() {
    if (this.selectedWalletProviderType === EthProviders.Type.KnownNetwork) {
      this.selectedWalletConnectionInfo = EthProviders.KnownNetworkType.homestead;
    } else {
      this.selectedWalletConnectionInfo = '';
    }
  }
  copyMWToCliboard() {
    this.copyToClipboard(this.getTrimmedMWords());
  }

  copyToClipboard(text: string) {
    this.cbService.copyFromContent(text);
  }

  getTrimmedMWords() {
    return this.mnemonicWords.trim();
  }

  isWalletRowExists(walletRow: WalletRow): boolean {
    const findExe = (obj) => {
      return obj.data.id === walletRow.data.id;
    };
    const result = this.wallets.find(findExe);
    if (result) {
      return true;
    }
    return false;
  }

  refreshList() {
    for (let i = 0; i < this.wallets.length; i++) {
      const item = this.wallets[i];
      if (item.deleted === true) {
        this.wallets.splice(i, 1);
        i -= 1;
      }
    }

    this.insecureWallets.forEach((item, index) => {
      const result = this.wallets.find((obj) => {
        return obj.data.id === item.id;
      });

      if (!result) {
        const txHistory = this.store.get('tx_' + item.id);
        const walletRow: WalletRow = {
          id: index,
          data: item,
          contractsExpanded: false,
          transactionsExpanded: false,
          ethBalanceWei: null,
          ethBalanceEther: null,
          etherBalanceGetter: null,
          transactionHistory: (txHistory === null ? [] : txHistory),
          deleted: false,
          extraData: { selectedContractType: ContractType.UNKNOWN, contractAddressToAdd: '' },
          contractWorkers: []
        };

        this.refreshContractWorkers(walletRow);
        this.startEtherBalanceRetrieving(walletRow);
        this.wallets.push(walletRow);
      }
    });
  }

  txToString(tx: any): string {
    return JSON.stringify(tx);
  }

  findContractWorker(walletRow: WalletRow, contractInfo: ContractInfo): any {
    for (let workerIndex = 0; workerIndex < walletRow.contractWorkers.length; workerIndex++) {
      const worker = walletRow.contractWorkers[workerIndex];

      if (worker.id === contractInfo.address) {
        return worker;
      }
    }

    return null;
  }

  refreshContractWorkers(walletRow: WalletRow) {
    // add work which not in workers
    walletRow.data.contracts.forEach((contractInfo) => {
      const contractAddr = contractInfo.address;

      let addWorker = true;
      for (let i = 0; i < walletRow.contractWorkers.length; i++) {
        const worker = walletRow.contractWorkers[i];
        if (worker.id === contractAddr) {
          addWorker = false;
          break;
        }
      }

      if (addWorker) {
        const worker: ContractWorker = {
          id: contractAddr,
          balance: null,
          adjustedBalance: null
        };
        walletRow.contractWorkers.push(worker);
      }
    });

    // remove work which not in stored
    for (let workerIndex = 0; workerIndex < walletRow.contractWorkers.length; workerIndex++) {
      const worker = walletRow.contractWorkers[workerIndex];
      let removeDeletedWorker = true;
      for (let i = 0; i < walletRow.data.contracts.length; i++) {
        const contractInfo: ContractInfo = walletRow.data.contracts[i];
        if (worker.id === contractInfo.address) {
          removeDeletedWorker = false;
          break;
        }
      }

      if (removeDeletedWorker) {
        walletRow.contractWorkers.splice(workerIndex, 1);
        workerIndex -= 1;
      }
    }
  }

  // @link : https://docs.ethers.io/ethers.js/html/api-wallet.html
  restoreWallet() {
    const mWords = this.getTrimmedMWords();
    if (mWords.length < 1) {
      alert('input mnemonic words!');
      return;
    }

    if (!this.selectedWalletProviderType || this.selectedWalletProviderType.length < 1) {
      alert('select wallet provider!');
      return;
    }
    if (!this.selectedWalletConnectionInfo || this.selectedWalletConnectionInfo.length < 1) {
      alert('input wallet provider connection info!');
      return;
    }

    const path = this.etherData.getBIP39DerivationPath(String(this.restoreWalletIndex));
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    const walletInfo: WalletInfo = {
      id: UUID.UUID(),
      address: wallet.address,
      info: {
        mnemonic: mWords,
        path: path,
        privateKey: wallet.privateKey,
      },
      contracts: [],
      provider: { type: this.selectedWalletProviderType, connectionInfo: this.selectedWalletConnectionInfo },
    };

    this.insecureWallets.push(walletInfo);
    this.refreshList();
  }

  encryptWalletToJson(wallet: Wallet) {
    wallet.encrypt(this.cfg.tempEncPassword).then(
      (val) => {
        console.log('encripted');
        console.log(val);
      },
      (reason) => {
        console.log('enc failed');
      }
    );
  }

  startEtherBalanceRetrieving(walletRow: WalletRow, forced = false) {
    if (walletRow.etherBalanceGetter !== null && forced === false) {
      this.logger.debug('balance already getting');
      return;
    }

    if (walletRow.etherBalanceGetter !== null) {
      window.clearTimeout(walletRow.etherBalanceGetter);
      walletRow.etherBalanceGetter = null;
    }
    walletRow.etherBalanceGetter = window.setTimeout(() => {
      this.retrieveEtherBalance(walletRow);
    }, 0);
  }

  retrieveEtherBalance(walletRow: WalletRow) {
    const clearWork = () => {
      if (walletRow.etherBalanceGetter !== null) {
        window.clearTimeout(walletRow.etherBalanceGetter);
        walletRow.etherBalanceGetter = null;
      }
    };

    const restartWork = () => {
      clearWork();
      walletRow.etherBalanceGetter = window.setTimeout(() => {
        this.retrieveEtherBalance(walletRow);
      }, delay);
    };

    if (walletRow.deleted === true) {
      clearWork();
      this.logger.debug('wallet deleted');
      return;
    }

    const delay = 3000;

    this.etherApi.getEthBalance(walletRow.data).then((val) => {
      walletRow.ethBalanceWei = val;
      walletRow.ethBalanceEther = ethers.utils.formatEther(val);

      restartWork();
    }, (err) => {
      this.logger.debug(err);
      restartWork();
    });
  }

  toggleWalletContractsRow(walletRow: WalletRow) {
    if (walletRow.contractsExpanded === true) {
      walletRow.contractsExpanded = false;
    } else {
      walletRow.contractsExpanded = true;
    }
  }

  toggleWalletTransactionsRow(walletRow: WalletRow) {
    if (walletRow.transactionsExpanded === true) {
      walletRow.transactionsExpanded = false;
    } else {
      walletRow.transactionsExpanded = true;
    }
  }

  deleteWallet(walletRow: WalletRow) {
    if (this.selectedWallet && walletRow.data.id === this.selectedWallet.data.id) {
      this.selectedWallet = null;
    }

    let indexToRemove = -1;
    this.insecureWallets.forEach((item, index) => {
      if (item.id === walletRow.data.id) {
        item.deleted = true;
        indexToRemove = index;
      }
    });
    if (indexToRemove >= 0) {
      this.insecureWallets.splice(indexToRemove, 1);
      this.refreshList();
    }
  }

  isSelectedWallet(wallet: WalletRow): boolean {
    if (!this.selectedWallet) {
      return false;
    }
    if (this.selectedWallet.data.id === wallet.data.id) {
      return true;
    }
    return false;
  }

  selectWallet(wallet: WalletRow) {
    this.selectedWallet = wallet;
  }

  /**
   * Transactions
   */
  sendEth(sendEthToInput: Input, sendEthAmountInput: Input) {
    if (!this.selectedWallet) { alert('select wallet'); return; }

    const sendEthTo = sendEthToInput.value;
    if (sendEthTo.length < 1) { alert('set receiver address'); return; }

    const sendEthAmount = sendEthAmountInput.value;
    let sendEthAmountBn: BigNumber = ethers.utils.parseEther(sendEthAmount);
    if (!sendEthAmountBn) { alert('set eth amount'); return; }

    const onTxCreate = (tx) => {
      this.selectedWallet.transactionHistory.push(tx);
      this.store.set('tx_' + this.selectedWallet.data.id, this.selectedWallet.transactionHistory);
    };

    this.etherApi.sendEth(this.selectedWallet.data, sendEthTo,
      sendEthAmountBn, -1,
      onTxCreate).then((txReceipt) => {
      alert('tx complete');
    }, (error) => {
      alert(error);
    });
  }

  /** Contract Features */
  onSelectContractType(index: number, type: ContractType) {
    this.logger.debug(index, type);
  }

  addContractInfoToWallet(walletRow: WalletRow) {
    const addr = walletRow.extraData.contractAddressToAdd;
    const type = walletRow.extraData.selectedContractType;

    this.logger.debug(addr, type);
    if (addr.length < 1) {
      alert('input contract address!');
      return;
    }

    if (walletRow.data.contracts === undefined) {
      walletRow.data.contracts = [];
    }

    const oldContract = walletRow.data.contracts.find((item) => {
      if (item.address === addr) {
        return true;
      }

      return false;
    });

    if (oldContract) {
      alert('same contract exists!');
      return;
    }

    walletRow.extraData.contractAddressToAdd = '';
    walletRow.data.contracts.push({ address: addr, type: type });
    this.syncDataToLocalStorage(walletRow);
    this.refreshContractWorkers(walletRow);
  }

  /**
   * Delete contract info from wallet
   * @param walletRow
   * @param contract
   */
  deleteContractInfoFromWallet(walletRow: WalletRow, contract: ContractInfo) {
    if (walletRow.data.contracts === undefined) {
      walletRow.data.contracts = [];
    }
    for (let i = 0; i < walletRow.data.contracts.length; i++) {
      const item = walletRow.data.contracts[i];
      if (item.address === contract.address) {
        walletRow.data.contracts.splice(i, 1);
        this.syncDataToLocalStorage(walletRow);
        this.refreshContractWorkers(walletRow);
        break;
      }
    }
  }

  /**
   * Sync modified wallet data with localStorage
   * @param walletRow
   */
  syncDataToLocalStorage(walletRow: WalletRow) {
    this.insecureWallets.forEach((item, index) => {
      if (item.id === walletRow.data.id) {
        item.contracts = walletRow.data.contracts;
      }
    });
  }

  // https://medium.com/@piyopiyo/how-to-get-erc20-token-balance-with-web3-js-206df52f2561
  getERC20TokenInfo(walletRow: WalletRow, contractInfo: ContractInfo) {
    this.etherApi.getERC20TokenInfo(walletRow.data, contractInfo).then(
      (result: { name: string, symbol: string, decimal: number }) => {
        this.logger.debug('erc-20 token info', result);
        contractInfo.contractInfo = result;
        this.syncDataToLocalStorage(walletRow);
      },
      (error) => {
        this.logger.debug(error);
      }
    );
  }

  getERC20TokenBalance(walletRow: WalletRow, contractInfo: ContractInfo) {
    this.etherApi.getERC20TokenBalance(walletRow.data, contractInfo).then(
      (result: { balance: BigNumber, adjustedBalance: BigNumber }) => {
        // { balance: BigNumber, adjustedBalance: BigNumber }
        const contractWorker = this.findContractWorker(walletRow, contractInfo);
        contractWorker.balance = result.balance;
        contractWorker.adjustedBalance = result.adjustedBalance;
      },
      (error) => {
        this.logger.debug(error);
      }
    );
  }

  transferERC20Token(walletRow: WalletRow, contractInfo: ContractInfo, toAddressInput: Input,
    sendingAmountInput: Input) {
    const onTransactionCreate = (tx) => {
      /** transaction info */
      walletRow.transactionHistory.push(tx);
      this.store.set('tx_' + walletRow.data.id, walletRow.transactionHistory);
    };
    const onTransactionReceipt = (txReceipt) => {
      this.logger.log('transaction receipt');
    }

    const onSuccess = (data) => {};
    const onError = (error) => {
      this.logger.debug('event : transfer failed!');
      this.logger.debug(error);
    };
    this.etherApi.transferERC20Token(
      walletRow.data, contractInfo,
      toAddressInput.value,
      sendingAmountInput.value, -1,
      onTransactionCreate, onTransactionReceipt).then(onSuccess, onError);
  }

  /**
   * Kybernetwork
   * https://developer.kyber.network/docs/WalletsGuide/
   * https://developer.kyber.network/docs/CodesAppendix/#broadcasting-transactions
   * https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol
   * ERC 20 sol : https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/ERC20.sol
   */
  kyberNetworkTradeEthToErc20Token(
    kyberTradeEthToErcTargetAddressInput: Input,
    kyberTradeEthToErcAmountInput: Input) {
    if (!this.selectedWallet) {
      alert('select an wallet first');
      return;
    }

    const onTxCreate = (txData) => {
      this.logger.debug("on tx create");
      this.selectedWallet.transactionHistory.push(txData);
      this.store.set('tx_' + this.selectedWallet.data.id, this.selectedWallet.transactionHistory);
    };
    const onTxReceipt = (txReceiptData) => {
      this.logger.debug("on tx receipt");
    };

    const onSuccess = (data) => { console.log(data); }
    const onError = (error) => { alert(error); }
    this.etherApi.kyberNetworkTradeEthToErc20Token(this.selectedWallet.data,
      kyberTradeEthToErcTargetAddressInput.value,
      kyberTradeEthToErcAmountInput.value,
      onTxCreate,
      onTxReceipt,
    ).then(onSuccess, onError);
  }

  // ====================================
  // Old Testing Codes
  // ====================================

  encJsonToWallet(json: string, password: string) {
    ethers.Wallet.fromEncryptedJson(json, password).then((result) => {
      console.log('wallet restored');
      console.log(result);
    });
  }

  convertWalletToJson(wallet: Wallet): any {
    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic,
      path: wallet.path,
      privateKey: wallet.privateKey
    };
  }

  convertToBigNumber(text: string, resultInput: Input) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }

  convertHexToBigNumber(text: string, resultInput: Input) {
    const bn = ethers.utils.bigNumberify(text);
    resultInput.value = bn.toString() + ' / ' + bn.toHexString();
  }
}