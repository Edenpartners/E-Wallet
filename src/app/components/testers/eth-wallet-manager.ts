import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  Input,
  SimpleChanges,
  OnChanges,
  ViewChild
} from '@angular/core';
import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'ngx-clipboard';
import { EtherDataService } from '../../providers/etherData.service';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';

import { WalletService, WalletTypes } from '../../providers/wallet.service';

import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherApiService } from '../../providers/etherApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from 'src/app/providers/appStorage.service';
import { Subscription, of, Observable } from 'rxjs';

import { Checkbox } from '@ionic/angular';

export interface WalletRow {
  /** just index */
  id: number;
  data: WalletTypes.WalletInfo;
  contractsExpanded: boolean;
  transactionsExpanded: boolean;
  ethBalanceWei: BigNumber;
  ethBalanceEther: string;
  etherBalanceGetter: any;
  deleted: boolean;

  selectedContract: WalletTypes.ContractInfo | null;
  transactionHistory: Array<any>;

  extraData: {
    selectedContractType: WalletTypes.ContractType.UNKNOWN;
    contractAddressToAdd: '';
  };

  contractWorkers: Array<ContractWorker>;
}

export interface ContractWorker {
  id: string;
  balance: BigNumber;
  adjustedBalance: BigNumber;
}

@Component({
  selector: 'eth-wallet-manager',
  templateUrl: 'eth-wallet-manager.html',
  styleUrls: ['./tester.scss']
})
export class EthWalletManager implements OnInit, OnDestroy, OnChanges {
  private wallets: Array<WalletRow> = [];
  private selectedWallet: WalletRow = null;

  @Output() walletSelect = new EventEmitter<void>();

  private walletsSubscription: Subscription;

  @Input() defaultCheckSignedIn = false;
  @Input() defaultFilteredWalletsByUserInfo = false;

  @ViewChild('checkSignedInBox') checkSignedInBox: Checkbox;
  @ViewChild('filteredWalletsByUserInfoBox')
  filteredWalletsByUserInfoBox: Checkbox;

  supportedContracts: Array<WalletTypes.ContractType> = [
    WalletTypes.ContractType.UNKNOWN,
    WalletTypes.ContractType.ERC20
  ];

  constructor(
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private store: LocalStorageService,
    private etherApi: EtherApiService,
    private storage: AppStorageService
  ) {}

  ngOnInit() {
    this.checkSignedInBox.checked = Boolean(this.defaultCheckSignedIn);
    this.filteredWalletsByUserInfoBox.checked = Boolean(
      this.defaultFilteredWalletsByUserInfo
    );

    const thisRef = this;
    const logger = this.logger;
    this.walletsSubscription = this.storage.walletsObserver.subscribe(
      //next
      () => {
        logger.debug('Wallet Manager : walletes state change');
        thisRef.refreshList();
      },
      //error
      error => {
        logger.debug('wallets state error');
      },
      //complete
      () => {
        logger.debug('wallets state complete');
      }
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.checkSignedIn) {
      this.logger.debug(changes.checkSignedIn.currentValue);
    }

    if (changes.filteredWalletsByUserInfo) {
      this.logger.debug(changes.filteredWalletsByUserInfo.currentValue);
    }
  }

  ngOnDestroy() {
    if (this.walletsSubscription && this.walletsSubscription.closed === false) {
      this.logger.debug('Wallet Manager call unsubscribe');
      this.walletsSubscription.unsubscribe();
      this.walletsSubscription = null;
    }
  }

  getSelectedWallet(): WalletRow {
    return this.selectedWallet;
  }
  copyToClipboard(text: string) {
    this.cbService.copyFromContent(text);
  }

  isWalletRowExists(walletRow: WalletRow): boolean {
    const findExe = obj => {
      return obj.data.id === walletRow.data.id;
    };
    const result = this.wallets.find(findExe);
    if (result) {
      return true;
    }
    return false;
  }

  refreshList() {
    this.logger.debug('refresh list');

    const walletInfoList = this.storage.getWallets(
      this.checkSignedInBox.checked,
      this.filteredWalletsByUserInfoBox.checked
    );

    for (let i = 0; i < this.wallets.length; i++) {
      const item = this.wallets[i];

      const walletInfo = walletInfoList.find(obj => {
        return obj.id === item.data.id;
      });
      if (!walletInfo) {
        this.logger.debug('pop from wallets : ' + i);
        this.wallets.splice(i, 1);
        i -= 1;
        this.stopEtherBalanceRetrieving(item);
        continue;
      }
    }

    walletInfoList.forEach((item, index) => {
      const result = this.wallets.find(obj => {
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
          transactionHistory: txHistory === null ? [] : txHistory,
          deleted: false,
          selectedContract: null,
          extraData: {
            selectedContractType: WalletTypes.ContractType.UNKNOWN,
            contractAddressToAdd: ''
          },
          contractWorkers: []
        };

        this.refreshContractWorkers(walletRow);
        this.startEtherBalanceRetrieving(walletRow);
        this.wallets.push(walletRow);
      }
    });
  }

  findContractWorker(
    walletRow: WalletRow,
    contractInfo: WalletTypes.ContractInfo
  ): any {
    for (
      let workerIndex = 0;
      workerIndex < walletRow.contractWorkers.length;
      workerIndex++
    ) {
      const worker = walletRow.contractWorkers[workerIndex];

      if (worker.id === contractInfo.address) {
        return worker;
      }
    }

    return null;
  }

  refreshContractWorkers(walletRow: WalletRow) {
    // add work which not in workers
    walletRow.data.contracts.forEach(contractInfo => {
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
    for (
      let workerIndex = 0;
      workerIndex < walletRow.contractWorkers.length;
      workerIndex++
    ) {
      const worker = walletRow.contractWorkers[workerIndex];
      let removeDeletedWorker = true;
      for (let i = 0; i < walletRow.data.contracts.length; i++) {
        const contractInfo: WalletTypes.ContractInfo =
          walletRow.data.contracts[i];
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

  stopEtherBalanceRetrieving(walletRow: WalletRow) {
    if (walletRow.etherBalanceGetter !== null) {
      window.clearTimeout(walletRow.etherBalanceGetter);
      walletRow.etherBalanceGetter = null;
    }
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

    this.etherApi.getEthBalance(walletRow.data).then(
      val => {
        walletRow.ethBalanceWei = val;
        walletRow.ethBalanceEther = ethers.utils.formatEther(val);

        restartWork();
      },
      err => {
        this.logger.debug(err);
        restartWork();
      }
    );
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
    if (
      this.selectedWallet &&
      walletRow.data.id === this.selectedWallet.data.id
    ) {
      this.selectWallet(null);
    }

    walletRow.deleted = true;
    this.storage.removeWallet(walletRow.data);
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
    this.walletSelect.emit();
  }

  /** Contract Features */
  onSelectContractType(index: number, type: WalletTypes.ContractType) {
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

    const oldContract = walletRow.data.contracts.find(item => {
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

  isSelectedContract(
    walletRow: WalletRow,
    contract: WalletTypes.ContractInfo
  ): boolean {
    if (!walletRow.selectedContract) {
      return false;
    }
    if (walletRow.selectedContract.address === contract.address) {
      return true;
    }

    return false;
  }

  selectContract(walletRow: WalletRow, contract: WalletTypes.ContractInfo) {
    walletRow.selectedContract = contract;
  }
  /**
   * Delete contract info from wallet
   * @param walletRow
   * @param contract
   */
  deleteContractInfoFromWallet(
    walletRow: WalletRow,
    contract: WalletTypes.ContractInfo
  ) {
    if (walletRow.data.contracts === undefined) {
      walletRow.data.contracts = [];
    }

    if (this.isSelectedContract(walletRow, contract)) {
      walletRow.selectedContract = null;
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
    this.storage.syncDataToLocalStorage(walletRow.data);
  }

  // https://medium.com/@piyopiyo/how-to-get-erc20-token-balance-with-web3-js-206df52f2561
  getERC20TokenInfo(
    walletRow: WalletRow,
    contractInfo: WalletTypes.ContractInfo
  ) {
    this.etherApi.getERC20TokenInfo(walletRow.data, contractInfo).then(
      (result: { name: string; symbol: string; decimal: number }) => {
        this.logger.debug('erc-20 token info', result);
        contractInfo.contractInfo = result;
        this.syncDataToLocalStorage(walletRow);
      },
      error => {
        this.logger.debug(error);
      }
    );
  }

  getERC20TokenBalance(
    walletRow: WalletRow,
    contractInfo: WalletTypes.ContractInfo
  ) {
    this.etherApi.getERC20TokenBalance(walletRow.data, contractInfo).then(
      (result: { balance: BigNumber; adjustedBalance: BigNumber }) => {
        // { balance: BigNumber, adjustedBalance: BigNumber }
        const contractWorker = this.findContractWorker(walletRow, contractInfo);
        contractWorker.balance = result.balance;
        contractWorker.adjustedBalance = result.adjustedBalance;
      },
      error => {
        this.logger.debug(error);
      }
    );
  }
}