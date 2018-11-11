import { Component, OnInit, Inject } from '@angular/core';
import { EthService, EthProvider } from '../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval} from 'rxjs';
import { AbiStorageService } from '../../providers/abiStorage.service';
import { WalletService, ContractInfo, ContractType, WalletInfo } from '../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService, KyberNetworkContractInformation } from '../../providers/kybernetwork.service';


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

  extraData: {
    selectedContractType: ContractType.UNKNOWN,
    contractAddressToAdd: ''
  };

  contractWorkers: Array<any>;
}

const standardBIP39path = 'm/44\'/60\'/0\'/0/0';
const standardBIP39pathExcludingIndex = 'm/44\'/60\'/0\'/0/';

@Component({
  selector: 'app-ethtest',
  templateUrl: './ethtest.page.html',
  styleUrls: ['./ethtest.page.scss']
})
export class EthtestPage implements OnInit {

  title = '';
  currentNum = 0;
  mnemonicWords = '';

  wallets: Array<WalletRow> = [];
  selectedWallet: any = null;

  @LocalStorage() insecureWallets = [];
  @LocalStorage() viewCounts = 0;

  restoreWalletIndex = 0;

  supportedContracts: Array<ContractType> = [ContractType.UNKNOWN, ContractType.ERC20];

  constructor(
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private abiStorage: AbiStorageService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService) { }

  ngOnInit() {
    this.refreshList();
  }

  generateRandomMnemonic() {
    this.mnemonicWords = ethers.Wallet.createRandom().mnemonic;
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

    this.insecureWallets.forEach( (item, index) => {
      const result = this.wallets.find((obj) => {
        return obj.data.id === item.id;
      });

      if (!result) {
        const walletRow: WalletRow = {
          id: index,
          data: item,
          contractsExpanded: false,
          transactionsExpanded: false,
          ethBalanceWei: null,
          ethBalanceEther: null,
          etherBalanceGetter: null,
          deleted: false,
          extraData : { selectedContractType: ContractType.UNKNOWN, contractAddressToAdd: '' },
          contractWorkers: []
        };

        this.refreshContractWorkers(walletRow);
        this.startEtherBalanceRetrieving(walletRow);
        this.wallets.push(walletRow);
      }
    });
  }

  findContractWorker(walletRow: WalletRow, contractInfo: ContractInfo): any {
    for (let workerIndex = 0; workerIndex < walletRow.contractWorkers.length; workerIndex ++) {
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
        const worker = {
          id: '',
          sendingTokenInfo: {
            to: '',
            amount: ''
          }
        };
        walletRow.contractWorkers.push(worker);
      }
    });

    // remove work which not in stored
    for (let workerIndex = 0; workerIndex < walletRow.contractWorkers.length; workerIndex ++) {
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
      return;
    }

    const path = standardBIP39pathExcludingIndex + String(this.restoreWalletIndex);
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    const walletInfo: WalletInfo = {
      id: UUID.UUID(),
      address: wallet.address,
      info: {
        mnemonic: mWords, path: path,
        privateKey: wallet.privateKey,
      },
      contracts: []
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
    if (walletRow.etherBalanceGetter !== null  && forced === false) {
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

    if (!this.eths.currentProvider) {
      this.logger.debug('need ethereum network provider');
      restartWork();
      return;
    }

    const p: EthProvider = this.eths.currentProvider;
    const w: Wallet = this.walletService.walletInstance(walletRow.data, p.getProvider());

    w.getBalance().then((val) => {
      walletRow.ethBalanceWei = val;
      walletRow.ethBalanceEther = ethers.utils.formatEther(val);

      restartWork();
    },
    (err) => {
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
    if (!this.selectedWallet) {
      alert('select wallet');
      return;
    }

    if (!this.eths.currentProvider) {
      alert('no connection');
      return;
    }

    const sendEthTo = sendEthToInput.value;
    if (sendEthTo.length < 1) {
      alert('set receiver address');
      return;
    }

    const sendEthAmount = sendEthAmountInput.value;

    const p: EthProvider = this.eths.currentProvider;
    const w: Wallet = new ethers.Wallet(this.selectedWallet.data.info.privateKey, p.getProvider());

    const amount = ethers.utils.parseEther(String(sendEthAmount));

    const tx = {
      to: sendEthTo,
      value: amount
    };

    const sendPromise = w.sendTransaction(tx);
    sendPromise.then(
      (resultTx) => {
        this.logger.debug(resultTx);
      },
      (e) => {
        this.logger.debug(e);
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

    const oldContract = walletRow.data.contracts.find( (item) => {
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
    if (walletRow.data.contracts === undefined){
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
    this.getERC20TokenInfoAsync(walletRow, contractInfo);
  }

  async getERC20TokenInfoAsync(walletRow: WalletRow, ctInfo: ContractInfo) {
    if (ctInfo.type !== ContractType.ERC20) {
      this.logger.debug('this is not an ERC-20 Token');
    }

    if (!this.eths.currentProvider) {
      this.logger.debug('need ethereum network provider');
      return;
    }

    const p: EthProvider = this.eths.currentProvider;
    const w: Wallet = this.walletService.walletInstance(walletRow.data, p.getProvider());

    // this.abiStorage.etherERC20
    // last argument as provider = readonly but wallet = r/w
    // https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917
    // https://docs.ethers.io/ethers.js/html/api-contract.html#contract-abi
    const contract = new Contract(ctInfo.address, this.abiStorage.etherERC20, p.getProvider());

    const logger = this.logger;

    const getInfoPromise = new Promise( async (resolve, reject) => {
      // Listen ERC-20 : Get Information
      const tokenName = await contract.name();
      logger.debug('got token name : ' + tokenName);
      const tokenSymbol = await  contract.symbol();
      logger.debug('got token symbol : ' + tokenSymbol);
      const decimal = await contract.decimals();
      logger.debug('got decimal : ' + decimal);

      const balanceOfAddress = await contract.balanceOf(walletRow.data.address);
      const adjustedBalance = balanceOfAddress / Math.pow(10, decimal);
      logger.debug('got balance : ' + balanceOfAddress + ' -> ' + adjustedBalance);

      const result = {
        name: tokenName,
        symbol: tokenSymbol,
        decimal: decimal
      };
      resolve(result);
    });

    getInfoPromise.then(
      (result: {name: string, symbol: string, decimal: number}) => {
        this.logger.debug('erc-20 token info', result);
        ctInfo.contractInfo = result;
        this.syncDataToLocalStorage(walletRow);
      },
      (error) => {
        this.logger.debug(error);
      }
    );
  }

  transferERC20Token(walletRow: WalletRow, ctInfo: ContractInfo, toAddressInput: Input, sendingAmountInput: Input) {
    if (!ctInfo.contractInfo) {
      this.logger.debug('no meta data for ERC-20 Token');
      return;
    }

    if (ctInfo.type !== ContractType.ERC20) {
      this.logger.debug('this is not an ERC-20 Token');
      return;
    }

    if (!this.eths.currentProvider) {
      this.logger.debug('need ethereum network provider');
      return;
    }

    const toAddress = toAddressInput.value;
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.bigNumberify(sendingAmountInput.value);

      for (let i = 0; i < ctInfo.contractInfo.decimal; i++) {
        adjustedAmount = adjustedAmount.mul(10);
      }
    } catch (e) {
      adjustedAmount = null;
      this.logger.debug(e);
    }

    this.logger.debug('checking transfer' + toAddress + ',' + adjustedAmount);

    if (!toAddress || toAddress.length < 1) { return; }
    if (!adjustedAmount) { return; }

    this.asyncTransferERC20Token(walletRow, ctInfo, toAddress, adjustedAmount);
  }

  async asyncTransferERC20Token(walletRow: WalletRow, ctInfo: ContractInfo, toAddress: string, sendingAmount: BigNumber) {
    const p: EthProvider = this.eths.currentProvider;
    const w: Wallet = this.walletService.walletInstance(walletRow.data, p.getProvider());

    this.logger.debug('start transfer erc-20 token');

    // this.abiStorage.etherERC20
    // last argument as provider = readonly but wallet = r/w
    const contract = new Contract(ctInfo.address, this.abiStorage.etherERC20, w);
    const transferEvent = new Promise((resolve, reject) => {
      // Listen ERC-20 : Transfer Event

      const transferListner = (from, to, amount, result) => {
        this.logger.debug(from);
        this.logger.debug(to);
        this.logger.debug(amount);
        this.logger.debug(result);

        contract.removeListener('Transfer', transferListner);
        resolve({
          from: from,
          to: to,
          amount: amount
        });

        setTimeout(() => {
          reject(new Error('timeout'));
        }, 60000);
      };


      this.logger.debug('Add Transfer Listener');
      contract.addListener('Transfer', transferListner);
    });

    /*
    chainId: 3
    data: "0xa9059cbb00000...b6b3a7640000"
    from: "0x5D09F493d1d2c2C5F218c43e2aC16f051D436976"
    gasLimit: t {_hex: "0x8ee1", _ethersType: "BigNumber"}
    gasPrice: t {_hex: "0x3b9aca00", _ethersType: "BigNumber"}
    hash: "0x5f4226bdd4bca3255cbd318245b735f325e406500125490e27f9e03bab3e0d67"
    nonce: 21
    r: "0xeef48580fc69b161e026faaf4cf8b967f762608ad7b69de917ff01b3d17ef469"
    s: "0x069db54618d2d40a31a630afc9dd16c174e79cc826dbe10310d66de6be13a889"
    to: "0x46EA3cb3bbfFb2095eb523a19278a0B73665D5B0"
    v: 41
    value: t {_hex: "0x00", _ethersType: "BigNumber"}
    wait: ƒ (e)
     */
    const tx: object = await contract.transfer(toAddress, sendingAmount);
    this.logger.debug(tx);

    // const resolvedData = await transferEvent;
    transferEvent.then(
      (resolvedData) => {
        this.logger.debug('transfer complete!');
        this.logger.debug(resolvedData);
      },
      (error) => {
        this.logger.debug('transfer failed!');
        this.logger.debug(error);
      }
    );
  }


  /**
   * Kybernetwork
   * https://developer.kyber.network/docs/WalletsGuide/
   * https://developer.kyber.network/docs/CodesAppendix/#broadcasting-transactions
   * https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol
   * ERC 20 sol : https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/ERC20.sol
   */
  async kyberNetworkTradeEthToErc20Token(
    kyberTradeEthToErcTargetAddressInput: Input,
    kyberTradeEthToErcAmountInput: Input) {

    if (!this.selectedWallet) {
      alert('select wallet');
      return;
    }

    if (!this.eths.currentProvider) {
      alert('no connection');
      return;
    }

    const targetErc20ContractAddres = kyberTradeEthToErcTargetAddressInput.value;
    if (targetErc20ContractAddres.length < 1) {
      alert('set target address');
      return;
    }

    const tradeEthAmount = kyberTradeEthToErcAmountInput.value;

    const p: EthProvider = this.eths.currentProvider;
    const w: Wallet = new ethers.Wallet(this.selectedWallet.data.info.privateKey, p.getProvider());

    const ethWeiAmount: BigNumber = ethers.utils.parseEther(String(tradeEthAmount));

    this.logger.debug('start trade ETH -> erc-20 token');

    // const kyberAbi =  this.abiStorage.kyberNetworkProxy;
    const kyberAbi =  this.abiStorage.etherERC20;

    // https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol
    const kyberProxyAbi = [
      'function getExpectedRate(address src, address dest, uint srcQty) public view returns(uint expectedRate, uint slippageRate)',
      'function trade(address src, uint srcAmount, address dest, address destAddress, ' +
        'uint maxDestAmount, uint minConversionRate, address walletId) ' +
        'public payable returns(uint)',
      'function swapEtherToToken(address token, uint minConversionRate) public payable returns(uint)'
    ];

    const contract = new Contract(
      KyberNetworkContractInformation.mainNet.KyberNetworkProxy,
      kyberProxyAbi,
      w);

    const expectedRateResult = contract.functions.getExpectedRate(
      this.abiStorage.tokenContractAddresses.mainNet.ETH,
      targetErc20ContractAddres,
      ethWeiAmount);

    expectedRateResult.then((result: Array<any>) => {
      this.logger.debug('result');
      this.logger.debug(result);

      let expectedRate: BigNumber = null;
      let slippageRate: BigNumber = null;

      result.forEach((element, index) => {
        this.logger.debug('result : ' + index);

        if (element['_hex']) {
          const hexVal = element['_hex'];
          this.logger.debug('hexlify : ' + ethers.utils.hexlify(hexVal));
          this.logger.debug('hexval : ' + hexVal);
          const num: BigNumber = ethers.utils.bigNumberify(hexVal);
          this.logger.debug('bn : ' + num);

          if (index === 0) {
            expectedRate = num;
          } else if (index === 1) {
            slippageRate = num;
          }
        }
      });

      if (expectedRate && slippageRate) {
        const tradePromise = contract.functions.swapEtherToToken(
          targetErc20ContractAddres,
          expectedRate,
          { value: ethWeiAmount }
        );

        this.logger.debug('run Trade');
        this.logger.debug(tradePromise);

        tradePromise.then((tradeResult) => {
          this.logger.debug('tradeResult');
          this.logger.debug(tradeResult);
        },
        (tradeError) => {
          this.logger.debug('tradeError');
          // gas required exceeds allowance or always failing transaction ?
          this.logger.debug(tradeError);
        });
        // contract.functions.trade(this.abiStorage.tokenContractAddresses.mainNet.ETH, ethWeiAmount,
          // targetErc20ContractAddres, w.address, );
      }
    },
    (e) => {
      this.logger.debug('error');
      this.logger.debug(e);
    });

    //swapEtherToToken
    console.log(expectedRateResult);

    // function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty)
    // function swapEtherToToken(ERC20 token, uint minConversionRate) public payable returns(uint) {
  }

  async kyberNetworkTradeErc20ToOther() {
    /**
     * srcTokenContract = new web3.eth.Contract(ERC20ABI, SRC_TOKEN_ADDRESS)
       allowanceAmount = srcTokenContract.methods.allowance(USER_WALLET_ADDRESS,KYBER_NETWORK_PROXY_ADDRESS).call()
        if (srcTokenWeiAmount <= allowanceAmount) {
            //proceed to step 3
        } else {
            //proceed to step 2
        }
     */
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
}
