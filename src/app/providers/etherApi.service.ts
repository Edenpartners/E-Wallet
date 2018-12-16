import { Injectable } from '@angular/core';

import { EthService, EthProviders } from './ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { EtherDataService } from './etherData.service';
import { WalletService, WalletTypes } from './wallet.service';
import { KyberNetworkService } from './kybernetwork.service';
import { Provider } from 'ethers/providers';
import { BigNumber, BigNumberish } from 'ethers/utils';
import {
  AppStorageTypes,
  AppStorageService
} from '../providers/appStorage.service';

import { env } from '../../environments/environment';
import { FeedbackUIService } from './feedbackUI.service';
import { Observable, Subscriber } from 'rxjs';
import { listutil, SubscriptionHandler, Map } from '../utils/listutil';

import { Events } from '@ionic/angular';
import { Consts } from 'src/environments/constants';

class TracsactionReceiptTracker extends SubscriptionHandler<any> {
  isTracking = true;
}

@Injectable({
  providedIn: 'root'
})
export class EtherApiService {
  receiptTrackingHashes: Map<TracsactionReceiptTracker> = {};

  constructor(
    public eths: EthService,
    private logger: NGXLogger,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherData: EtherDataService,
    private storage: AppStorageService,
    private feedbackUI: FeedbackUIService,
    private events: Events
  ) {}

  getEthBalance(walletInfo: WalletTypes.EthWalletInfo): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      const p: EthProviders.Base = this.eths.getProvider(
        walletInfo.info.provider
      );
      const rp = p.getEthersJSProvider();
      rp.getBalance(walletInfo.address).then(
        val => {
          finalResolve(val);
        },
        err => {
          this.logger.debug(err);
          finalReject(err);
        }
      );
    });
  }

  sendEth(
    params: {
      walletInfo: WalletTypes.EthWalletInfo;
      sendEthTo: string;
      sendWeiAmount: BigNumber;
      customLogData?: any;
    },
    password: string,
    onTransactionCreate: ((any) => void) = tx => {},
    onTransactionReceipt: ((txReceipt: any) => void) = null
  ): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      if (params.sendEthTo.length < 1) {
        finalReject(new Error('set receiver address'));
        return;
      }

      const p: EthProviders.Base = this.eths.getProvider(
        params.walletInfo.info.provider
      );

      const w: Wallet = this.walletService.createEthWalletInstance(
        params.walletInfo,
        password
      );

      if (!w) {
        finalReject(new Error('invalid wallet'));
        return;
      }

      const txData = {
        to: params.sendEthTo,
        value: params.sendWeiAmount
      };

      const sendPromise = w.sendTransaction(txData);
      sendPromise.then(
        tx => {
          this.logger.debug(tx);
          this.events.publish('eth.send.tx.create', params, tx);

          if (env.config.showDebugToast) {
            this.feedbackUI.showToast('Tracsaction requested.');
          }

          onTransactionCreate(tx);

          this.trackTransactionReceipt(p, tx.hash).then(
            txReceipt => {
              this.events.publish('eth.send.tx.receipt', params, txReceipt);

              if (onTransactionReceipt !== null) {
                onTransactionReceipt(txReceipt);
              }
              finalResolve(txReceipt);
            },
            txReceiptError => {
              this.logger.debug(txReceiptError);
              finalReject(txReceiptError);
            }
          );
        },
        txError => {
          this.logger.debug(txError);
          finalReject(txError);
        }
      );
    });
  }

  getERC20TokenInfo(
    walletInfo: WalletTypes.EthWalletInfo,
    ctInfo: WalletTypes.ContractInfo,
    timeout = -1
  ): Promise<any> {
    return new Promise<any>(async (finalResolve, finalReject) => {
      if (ctInfo.type !== WalletTypes.ContractType.ERC20) {
        finalReject(new Error('this is not an ERC-20 Token'));
        return;
      }

      const p: EthProviders.Base = this.eths.getProvider(
        walletInfo.info.provider
      );

      // this.abiStorage.etherERC20
      // last argument as provider = readonly but wallet = r/w
      // https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917
      // https://docs.ethers.io/ethers.js/html/api-contract.html#contract-abi
      const erc20Abi = this.etherData.abiResolver.getERC20(
        p.info.connectionInfo
      );
      const contract = new Contract(
        ctInfo.address,
        erc20Abi,
        p.getEthersJSProvider()
      );

      const logger = this.logger;

      let getInfoComplete = false;
      if (timeout >= 0) {
        setTimeout(() => {
          if (getInfoComplete === false) {
            finalReject(new Error('timeout'));
          }
        }, timeout);
      }

      // Listen ERC-20 : Get Information
      const tokenName = await contract.name();
      const tokenSymbol = await contract.symbol();
      const decimal = await contract.decimals();

      logger.debug('got token name : ' + tokenName);
      logger.debug('got token symbol : ' + tokenSymbol);
      logger.debug('got decimal : ' + decimal);

      getInfoComplete = true;

      const result = {
        name: tokenName,
        symbol: tokenSymbol,
        decimal: decimal
      };
      finalResolve(result);
    });
  }

  async getERC20TokenBalance(
    walletInfo: WalletTypes.EthWalletInfo,
    ctInfo: WalletTypes.ContractInfo,
    timeout = -1
  ): Promise<any> {
    return new Promise<any>(async (finalResolve, finalReject) => {
      if (ctInfo.type !== WalletTypes.ContractType.ERC20) {
        finalReject(new Error('this is not an ERC-20 Token'));
        return;
      }

      const p: EthProviders.Base = this.eths.getProvider(
        walletInfo.info.provider
      );

      // this.abiStorage.etherERC20
      // last argument as provider = readonly but wallet = r/w
      // https://blog.ricmoo.com/human-readable-contract-abis-in-ethers-js-141902f4d917
      // https://docs.ethers.io/ethers.js/html/api-contract.html#contract-abi
      const erc20Abi = this.etherData.abiResolver.getERC20(
        p.info.connectionInfo
      );
      const contract = new Contract(
        ctInfo.address,
        erc20Abi,
        p.getEthersJSProvider()
      );

      let getInfoComplete = false;
      if (timeout >= 0) {
        setTimeout(() => {
          if (getInfoComplete === false) {
            finalReject(new Error('timeout'));
          }
        }, timeout);
      }

      const decimal = await contract.decimals();
      const balanceBn: BigNumber = await contract.balanceOf(walletInfo.address);
      const adjustedBalanceBn = ethers.utils.formatUnits(balanceBn, decimal);

      getInfoComplete = true;
      const result = {
        balance: balanceBn,
        adjustedBalance: adjustedBalanceBn
      };
      finalResolve(result);
    });
  }

  /**
   *
   * @param walletInfo
   * @param ctInfo
   * @param toAddress
   * @param srcAmount
   * @param timeout -1 : disable watching timeout or set to 0 ~
   */
  async transferERC20Token(
    params: {
      walletInfo: WalletTypes.EthWalletInfo;
      ctInfo: WalletTypes.ContractInfo;
      toAddress: string;
      srcAmount: BigNumber;
      customLogData?: any;
    },
    password: string,
    onTransactionCreate: ((any) => void) = tx => {},
    onTransactionReceipt: ((txReceipt: any) => void) = null
  ): Promise<any> {
    return new Promise(async (finalResolve, finalReject) => {
      if (!params.ctInfo.contractInfo) {
        finalReject(new Error('No meta data for ERC-20 Token'));
        return;
      }

      if (params.ctInfo.type !== WalletTypes.ContractType.ERC20) {
        finalReject(new Error('This is not an ERC-20 Token'));
        return;
      }

      this.logger.debug(
        'checking transfer to : ' + params.toAddress + ',' + params.srcAmount
      );

      if (!params.toAddress || params.toAddress.length < 1) {
        finalReject(new Error('To address required'));
        return;
      }
      if (!params.srcAmount) {
        finalReject(new Error('Amount required'));
        return;
      }

      const p: EthProviders.Base = this.eths.getProvider(
        params.walletInfo.info.provider
      );

      const w: Wallet = this.walletService.createEthWalletInstance(
        params.walletInfo,
        password
      );

      if (!w) {
        finalReject(new Error('Invalid wallet'));
        return;
      }

      this.logger.debug('start transfer erc-20 token');

      // this.abiStorage.etherERC20
      // last argument as provider = readonly but wallet = r/w
      const contract = new Contract(
        params.ctInfo.address,
        this.etherData.abiResolver.getERC20(p),
        w
      );

      const transferEvent = new Promise((eventResolve, eventReject) => {
        // Listen ERC-20 : Transfer Event
        const transferListner = (from, to, amount, result) => {
          contract.removeListener('Transfer', transferListner);
          eventResolve({
            from: from,
            to: to,
            amount: amount,
            result: result
          });
        };

        this.logger.debug('Add Transfer Listener');
        contract.addListener('Transfer', transferListner);
      });

      // const resolvedData = await transferEvent;
      transferEvent.then(
        eventData => {
          this.logger.debug('==========================');
          this.logger.debug('event : transfer complete!');
          this.logger.debug(eventData);
          this.logger.debug('==========================');
          if (env.config.showDebugToast) {
            this.feedbackUI.showToast('Trade complete.');
          }
          finalResolve(eventData);
        },
        eventError => {
          finalReject(eventError);
        }
      );

      const gasPrice: BigNumber = await this.getGasPrice(p);

      let estimatedGasBn = null;
      try {
        estimatedGasBn = await contract.estimate.transfer(
          params.toAddress,
          params.srcAmount
        );
      } catch (e) {
        if (e.message) {
          this.logger.debug(e.message);
        }

        this.logger.debug('estimate failed');
        finalReject(e);
      }
      if (!estimatedGasBn) {
        return;
      }

      this.logger.debug(
        'got estimated val : ' + estimatedGasBn + ', gasPrice : ' + gasPrice
      );

      const tp = contract.functions.transfer(
        params.toAddress,
        params.srcAmount,
        {
          gasPrice: gasPrice,
          gasLimit: estimatedGasBn
        }
      );

      // https://docs.ethers.io/ethers.js/html/api-providers.html?highlight=gettransaction#transaction-response
      tp.then(
        tx => {
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
          this.logger.debug('==========================');
          this.logger.debug('transaction created');
          this.logger.debug(tx);
          this.logger.debug('==========================');

          this.events.publish('eth.erc20.send.tx.create', params, tx);

          if (env.config.showDebugToast) {
            this.feedbackUI.showToast('Tracsaction requested.');
          }

          onTransactionCreate(tx);

          this.trackTransactionReceipt(p, tx.hash).then(
            txReceipt => {
              this.logger.debug('==========================');
              this.logger.debug('transaction receipted');
              this.logger.debug(txReceipt);
              this.logger.debug('==========================');

              this.events.publish(
                'eth.erc20.send.tx.receipt',
                params,
                txReceipt
              );

              if (onTransactionReceipt !== null) {
                onTransactionReceipt(txReceipt);
              }
            },
            error => {
              this.logger.debug('txReceiptError');
              this.logger.debug(error);
            }
          );
        },
        txError => {
          this.logger.debug('transfer failed');
          this.logger.debug(txError);
          finalReject(txError);
        }
      );
    });
  } // end of function

  getTransaction(p: EthProviders.Base, txHash: string) {
    const ethP = p.getEthersJSProvider();
    return ethP.getTransaction(txHash);
  }

  isTransactionReceiptTracking(txHash: string): boolean {
    if (this.receiptTrackingHashes[txHash]) {
      return true;
    }
    return false;
  }

  getTransactionReceiptTrackingObserver(txHash: string): Observable<any> {
    const tracker: TracsactionReceiptTracker = this.receiptTrackingHashes[
      txHash
    ];

    if (!tracker) {
      return null;
    }

    return tracker.createObserver();
  }

  trackTransactionReceipt(
    p: EthProviders.Base,
    txHash: string,
    repeatIfError: boolean = true,
    repeatDelay = 3000,
    timeout = -1
  ): Promise<ethers.providers.TransactionReceipt> {
    const tracker = new TracsactionReceiptTracker();
    this.receiptTrackingHashes[txHash] = tracker;

    return new Promise<ethers.providers.TransactionReceipt>(
      async (finalResolve, finalReject) => {
        const trackingFlagRemover = () => {
          //delete tracking flag from map
          tracker.isTracking = false;
          tracker.clean();
          delete this.receiptTrackingHashes[txHash];
        };

        this.logger.debug('start transaction tracking');

        const rp = p.getEthersJSProvider();

        let repeatCount = 0;
        let workerTimer = null;
        const clearWorker = () => {
          if (workerTimer) {
            clearTimeout(workerTimer);
            workerTimer = null;
          }
        };

        const retryWorker = err => {
          if (repeatIfError && isComplete === false) {
            clearWorker();
            workerTimer = setTimeout(worker, repeatDelay);
          } else {
            trackingFlagRemover();
            finalReject(err);
          }
        };
        let isComplete = false;
        const worker = () => {
          this.logger.debug('repeat tx receipt : ' + repeatCount);
          repeatCount += 1;

          rp.getTransactionReceipt(txHash).then(
            (txReceipt: ethers.providers.TransactionReceipt) => {
              if (!txReceipt) {
                retryWorker(new Error('no data'));
              } else {
                this.logger.debug(
                  'tx receipted with retry count : ' + (repeatCount - 1)
                );
                this.logger.debug(txReceipt);
                isComplete = true;

                if (env.config.showDebugToast) {
                  this.feedbackUI.showToast('Tracsaction receipted.');
                }

                trackingFlagRemover();
                tracker.notifyToSubscribers(txReceipt);
                finalResolve(txReceipt);
              }
            },
            err => {
              retryWorker(err);
            }
          );
        };

        worker();

        if (timeout >= 0) {
          const startTime = new Date().getTime();
          let intervalId = setInterval(() => {
            const now = new Date().getTime();
            const diffTime = now - startTime;
            if (isComplete || diffTime >= timeout) {
              clearInterval(intervalId);
              intervalId = null;
              if (diffTime >= timeout) {
                clearWorker();
                trackingFlagRemover();
                finalReject(new Error('timeout'));
              }
              return;
            }
          }, 1000);
        }
      }
    );
  }

  getGasPrice(p: EthProviders.Base): Promise<BigNumber> {
    return p.getEthersJSProvider().getGasPrice();
  }

  /**
   * Kybernetwork
   * https://developer.kyber.network/docs/WalletsGuide/
   * https://developer.kyber.network/docs/CodesAppendix/#broadcasting-transactions
   * https://github.com/KyberNetwork/smart-contracts/blob/master/contracts/KyberNetworkProxy.sol
   * ERC 20 sol : https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/ERC20.sol
   */
  async kyberNetworkTradeEthToErc20Token(
    params: {
      walletInfo: WalletTypes.EthWalletInfo;
      targetErc20ContractAddres: string;
      srcEthAmount: BigNumber;
      customLogData?: any;
    },
    password: string,
    onTransactionCreate: ((any) => void) = tx => {},
    onTransactionReceipt: ((txReceipt: any) => void) = null
  ) {
    return new Promise(async (finalResolve, finalReject) => {
      if (params.targetErc20ContractAddres.length < 1) {
        finalReject(new Error('set target address'));
        return;
      }

      const p: EthProviders.Base = this.eths.getProvider(
        params.walletInfo.info.provider
      );
      const rp: Provider = p.getEthersJSProvider();
      const w: Wallet = this.walletService.createEthWalletInstance(
        params.walletInfo,
        password
      );

      if (!w) {
        finalReject(new Error('invalid wallet'));
        return;
      }

      this.logger.debug('start trade ETH -> erc-20 token');
      const kyberProxyAbi = this.etherData.abiResolver.getKyberNetworkProxy(p);

      const contract = new Contract(
        this.etherData.contractResolver.getKyberNetworkProxy(p),
        kyberProxyAbi,
        w
      );

      // may be 1 gwei
      const gasPrice: BigNumber = await this.getGasPrice(p);
      // or let maxGasPrice = await KyberNetworkProxyContract.methods.maxGasPrice().call()
      console.log('got gas price : ' + gasPrice);

      this.kyberNetworkGetExpectedTradeRate(
        contract,
        this.etherData.contractResolver.getETH(p),
        params.targetErc20ContractAddres,
        params.srcEthAmount
      )
        .then(getRateData => {
          return this.kyberNetworkExecuteTrade(
            contract,
            gasPrice,
            params.targetErc20ContractAddres,
            params.srcEthAmount,
            getRateData.slippageRate
          );
        })
        .then(tx => {
          this.events.publish('exchange.kyber.tx.create', params, tx);
          if (env.config.showDebugToast) {
            this.feedbackUI.showToast('Tracsaction requested.');
          }

          onTransactionCreate(tx);
          this.trackTransactionReceipt(p, tx.hash).then(
            txReceipt => {
              this.events.publish(
                'exchange.kyber.tx.receipt',
                params,
                txReceipt
              );

              if (onTransactionReceipt !== null) {
                onTransactionReceipt(txReceipt);
              }
            },
            error => {
              this.logger.debug('txReceiptError');
              this.logger.debug(error);
            }
          );

          return this.kyberNetworkHandleExecuteTradeEvent(contract);
        })
        .then(resolvedData => {
          this.logger.debug('==========================');
          this.logger.debug('event : ExecuteTradeEvent complete!');
          this.logger.debug(resolvedData);
          this.logger.debug('==========================');

          if (env.config.showDebugToast) {
            this.feedbackUI.showToast('Trade complete.');
          }
          finalResolve(resolvedData);
        })
        .catch(error => {
          finalReject(error);
        });
    });
  }

  async kyberNetworkExecuteTrade(
    contract: Contract,
    gasPrice: BigNumber,
    destTokenAddress: string,
    srcAmount: BigNumber,
    minConversionRate: BigNumber
  ): Promise<any> {
    return new Promise(async (finalResolve, finalReject) => {
      let estimatedGasBn = null;
      try {
        estimatedGasBn = await contract.estimate.swapEtherToToken(
          destTokenAddress,
          minConversionRate,
          { value: srcAmount }
        );
      } catch (e) {
        if (e.message) {
          this.logger.debug(e.message);
        }

        this.logger.debug('estimate failed');
        finalReject(e);
      }
      if (!estimatedGasBn) {
        return;
      }

      console.log('got estimated val : ' + estimatedGasBn);

      const tradePromise = contract.functions.swapEtherToToken(
        destTokenAddress,
        minConversionRate,
        { value: srcAmount, gasPrice: gasPrice, gasLimit: estimatedGasBn }
      );

      this.logger.debug('run Trade');
      tradePromise.then(
        tx => {
          finalResolve(tx);
        },
        tradeError => {
          finalReject(tradeError);
        }
      );
    });
  }

  kyberNetworkGetExpectedTradeRateWithWallet(
    walletInfo: WalletTypes.EthWalletInfo,
    srcTokenAddress: string,
    destTokenAddress: string,
    srcQty: BigNumberish
  ): Promise<any> {
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );
    const rp: Provider = p.getEthersJSProvider();
    const kyberProxyAbi = this.etherData.abiResolver.getKyberNetworkProxy(p);

    const contract = new Contract(
      this.etherData.contractResolver.getKyberNetworkProxy(p),
      kyberProxyAbi,
      rp
    );

    return this.kyberNetworkGetExpectedTradeRate(
      contract,
      srcTokenAddress,
      destTokenAddress,
      srcQty
    );
  }

  kyberNetworkGetExpectedTradeRate(
    contract: Contract,
    srcTokenAddress: string,
    destTokenAddress: string,
    srcQty: BigNumberish
  ): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      let srcQtyBn = null;
      try {
        srcQtyBn = ethers.utils.bigNumberify(srcQty);
      } catch (e) {
        finalReject(e);
        return;
      }

      // Expecting Rate
      const expectedRateResult = contract.functions.getExpectedRate(
        srcTokenAddress, //srcAddress
        destTokenAddress,
        srcQtyBn
      );

      // function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty)
      expectedRateResult.then(
        (result: Array<any>) => {
          this.logger.debug('result');
          this.logger.debug(result);

          let expectedRate: BigNumber = null;
          let slippageRate: BigNumber = null;

          result.forEach((element, index) => {
            if (element['_hex']) {
              const hexVal = element['_hex'];
              const num: BigNumber = ethers.utils.bigNumberify(hexVal);

              if (index === 0) {
                expectedRate = num;
              } else if (index === 1) {
                slippageRate = num;
              }
            }
          });

          this.logger.debug(
            'expected rate : ' +
              expectedRate +
              ', slippage rate : ' +
              slippageRate
          );
          // run trade
          if (expectedRate && slippageRate) {
            finalResolve({
              expectedRate: expectedRate,
              slippageRate: slippageRate
            });
          } else {
            finalReject(new Error('cannot resolve rates'));
          }
        },
        error => {
          this.logger.debug(error);
          finalReject(error);
        }
      );
    });
  }

  kyberNetworkHandleExecuteTradeEvent(
    contract: Contract,
    timeout = -1
  ): Promise<object> {
    const executeTradeEvent = new Promise((resolve, reject) => {
      // Listen ERC-20 : Transfer Event

      let eventComplete = false;
      const transferListner = (
        trader,
        srcTokenContractAddress,
        dstTokenContractAddress,
        actualSrcAmount,
        actualDestAmount,
        result
      ) => {
        contract.removeListener('ExecuteTrade', transferListner);

        eventComplete = true;
        // const num: BigNumber = ethers.utils.bigNumberify(hexVal);
        resolve({
          trader: trader,
          srcTokenContractAddress: srcTokenContractAddress,
          dstTokenContractAddress: dstTokenContractAddress,
          actualSrcAmount: actualSrcAmount,
          actualDestAmount: actualDestAmount,
          result: result
        });
      };

      if (timeout >= 0) {
        setTimeout(() => {
          if (eventComplete === false) {
            contract.removeListener('Transfer', transferListner);
            reject(new Error('timeout'));
          }
        }, timeout);
      }

      this.logger.debug('Add ExecuteTrade Listener');
      contract.addListener('ExecuteTrade', transferListner);
    });

    return executeTradeEvent;
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
}
