import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FirebaseService } from 'src/app/providers/firebase.service';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase';
import { NGXLogger } from 'ngx-logger';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Header, Platform } from '@ionic/angular';
import { UUID } from 'angular2-uuid';
import { HTTP } from '@ionic-native/http/ngx';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { TwitterConnect } from '@ionic-native/twitter-connect/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Facebook } from '@ionic-native/facebook/ngx';
import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';
import { Subscription } from 'rxjs';

import { ethers, Wallet, Contract } from 'ethers';
import { Provider } from 'ethers/providers';

import { WalletService, WalletTypes } from '../../providers/wallet.service';

import { Bip39Handler } from '../../components/testers/bip39-handler';
import { EthProviderMaker } from '../../components/testers/eth-provider-maker';
import {
  EthWalletManager,
  WalletRow
} from '../../components/testers/eth-wallet-manager';
import { BigNumber } from 'ethers/utils';
import { EtherApiService } from '../../providers/etherApi.service';
import { EtherDataService } from '../../providers/etherData.service';

import { EthService, EthProviders } from '../../providers/ether.service';
import { env } from '../../../environments/environment';

// https://github.com/angular/angularfire2/blob/master/docs/ionic/v3.md
// https://beta.ionicframework.com/docs/native/facebook
// https://beta.ionicframework.com/docs/native/twitter-connect
// https://beta.ionicframework.com/docs/native/google-plus

@Component({
  selector: 'app-apitest',
  templateUrl: './apitest.page.html',
  styleUrls: ['./apitest.page.scss']
})
export class ApitestPage implements OnInit, OnDestroy {
  private userStateSubscription: Subscription;
  private userInfoText = '';
  private tednBalance = null;
  private ethaddressToSend = '';

  private tdenTransactionList = [];

  @ViewChild(Bip39Handler) bip39Handler: Bip39Handler;
  @ViewChild(EthProviderMaker) ethProviderMaker: EthProviderMaker;
  @ViewChild(EthWalletManager) ethWalletManager: EthWalletManager;

  constructor(
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private platform: Platform,
    private walletService: WalletService,
    private appVersion: AppVersion,
    private etherApi: EtherApiService,
    private etherData: EtherDataService,
    private eths: EthService
  ) {
    if (this.platform.is('mobile') && this.platform.is('cordova')) {
      appVersion.getAppName().then(ver => {
        this.logger.debug('app ver : ' + ver);
      });
      appVersion.getPackageName().then(packageName => {
        this.logger.debug('package name' + packageName);
      });
    }

    this.logger.debug(this.platform.platforms());
  }

  ngOnInit() {
    this.logger.debug('ethtest component init');
    this.userStateSubscription = this.storage.userStateObserver.subscribe(
      //next
      user => {
        this.logger.debug('api test : user state change', user);

        if (user) {
          this.userInfoText = JSON.stringify(user.userInfo, null, 2);
        } else {
          this.userInfoText = '';
        }
      },
      //error
      error => {
        this.logger.debug('user state error');
      },
      //complete
      () => {
        this.logger.debug('user state complete');
      }
    );
  }

  ngOnDestroy() {
    this.logger.debug('ethtest component destroyed');
    if (
      this.userStateSubscription &&
      this.userStateSubscription.closed === false
    ) {
      this.userStateSubscription.unsubscribe();
      this.userStateSubscription = null;
    }
  }

  isSignedIn(): boolean {
    return this.storage.isSignedIn;
  }

  getDisplayableName(): string {
    if (this.storage.user) {
      if (this.storage.user.fbUser.displayName) {
        return this.storage.user.fbUser.displayName;
      } else if (this.storage.user.fbUser.email) {
        return this.storage.user.fbUser.email;
      } else {
        return 'Unknown User';
      }
    } else {
      return '';
    }
  }

  signoutFirebase() {
    this.ednApi.signout().finally(() => {
      this.ednApi.signoutFirebase().then(() => {
        this.storage.wipeData();
      });
    });
  }

  registerFirebaseUser(userId: string, userPasswd: string) {
    this.ednApi.registerFirebaseUser(userId, userPasswd).then(
      fbResult => {
        this.runEdnSignup();
      },
      fbError => {
        if (fbError.message) {
          alert(fbError.message);
        }
      }
    );
  }

  signinFirebaseUser(userId: string, userPasswd: string) {
    this.ednApi.signinFirebaseUser(userId, userPasswd).then(
      fbResult => {
        this.runEdnSignin();
      },
      fbError => {
        if (fbError.message) {
          alert(fbError.message);
        }
      }
    );
  }

  runEdnSignup() {
    this.ednApi.signup().then(
      userInfoResult => {
        if (userInfoResult.data) {
          this.storage.userInfo = userInfoResult.data;
        }
      },
      ednError => {
        this.logger.debug(ednError);
        this.logger.debug('edn signup failed !');
      }
    );
  }

  runEdnSignin() {
    let signinPromise;
    if (env.config.patches.useSignupForSignin) {
      signinPromise = this.ednApi.signup();
    } else {
      signinPromise = this.ednApi.signin();
    }

    signinPromise.then(
      ednResult => {
        this.logger.debug('edn signin success !');

        this.ednApi.getUserInfo().then(
          userInfoResult => {
            if (userInfoResult.data) {
              this.storage.userInfo = userInfoResult.data;
            }
          },
          userInfoError => {
            this.logger.debug(userInfoError);
            this.logger.debug('userInfoError !');
          }
        );
      },
      ednError => {
        this.logger.debug(ednError);
        this.logger.debug('edn signin failed !');
      }
    );
  }

  signinFirebaseUserWithGoogle(isSignup) {
    this.ednApi.signinFirebaseUserWithGoogle().then(
      fbResult => {
        if (isSignup) {
          this.runEdnSignup();
        } else {
          this.runEdnSignin();
        }
      },
      fbError => {
        if (fbError.message) {
          alert(fbError.message);
        }
      }
    );
  }

  signinFirebaseUserWithFacebook(isSignup) {
    this.ednApi.signinFirebaseUserWithFacebook().then(
      result => {
        if (isSignup) {
          this.runEdnSignup();
        } else {
          this.runEdnSignin();
        }
      },
      error => {
        if (error.message) {
          alert(error.message);
        }
      }
    );
  }

  signinFirebaseUserWithTwitter(isSignup) {
    this.ednApi.signinFirebaseUserWithTwitter().then(
      result => {
        if (isSignup) {
          this.runEdnSignup();
        } else {
          this.runEdnSignin();
        }
      },
      error => {
        if (error.message) {
          alert(error.message);
        }
      }
    );
  }

  fetchFirebaseSigninInfo(userId: string) {
    this.ednApi.fetchFirebaseSigninInfo(userId).then(
      result => {},
      error => {
        if (error.message) {
          alert(error.message);
        }
      }
    );
  }

  getUserInfo() {
    this.ednApi.getUserInfo().then(
      userInfoResult => {
        this.storage.userInfo = userInfoResult.data;
        this.userInfoText = JSON.stringify(userInfoResult.data, null, 2);
      },
      userInfoErr => {
        this.logger.debug(userInfoErr);
      }
    );
  }
  updateUserInfo() {
    let userInfoObj = null;
    try {
      userInfoObj = JSON.parse(this.userInfoText);
    } catch (e) {
      this.logger.debug(e);
    }

    if (!userInfoObj) {
      return;
    }

    this.ednApi.updateUserInfo(userInfoObj).then(
      userInfoResult => {
        alert('ok');
      },
      userInfoErr => {
        this.logger.debug(userInfoErr);
      }
    );
  }
  getTEDNBalance() {
    this.ednApi.getTEDNBalance().then(
      resultData => {
        this.logger.debug(resultData);
        this.tednBalance = ethers.utils.formatUnits(resultData.data.amount, 18);
      },
      resultErr => {
        this.logger.debug(resultErr);
      }
    );
  }

  runDepositTEDNApi(txhash) {
    this.ednApi.depositToTEDN(txhash).then(
      result => {
        this.getTEDNBalance();
      },
      error => {
        alert(error);
      }
    );
  }

  depositTEDN(amount: string) {
    const walletRow = this.ethWalletManager.getSelectedWallet();
    if (!walletRow) {
      alert('select wallet first!');
      return;
    }
    if (!this.storage.coinHDAddress) {
      alert('coin hd address not exists!');
      return;
    }

    if (!amount) {
      alert('invalid amount !');
      return;
    }

    try {
      ethers.utils.bigNumberify(amount);
    } catch (e) {
      this.logger.debug(e);
      alert('invalid amount !');
      return;
    }

    const walletInfo = walletRow.data;
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    this.logger.debug('========= DEPOSIT ========== ');
    this.logger.debug(ednContractInfo);
    this.logger.debug(amount);
    const onTransactionCreate = tx => {
      /** transaction info */
      this.storage.addTx(
        walletInfo,
        AppStorageTypes.TxType.EthERC20Transfer,
        AppStorageTypes.TxSubType.Send,
        tx.hash,
        AppStorageTypes.TxState.Created,
        new Date(),
        {
          from: walletInfo.address,
          to: this.storage.coinHDAddress,
          amount: amount
        },
        null
      );
    };

    const onTransactionReceipt = txReceipt => {
      this.logger.log('transaction receipt');
      this.logger.log(txReceipt);

      this.storage.addTxLog(
        walletInfo,
        txReceipt.transactionHash,
        AppStorageTypes.TxState.Receipted,
        new Date(),
        null
      );
    };

    const onSuccess = data => {
      this.logger.debug('event : transfer success!');

      if (data.result && data.result.transactionHash) {
        this.runDepositTEDNApi(data.result.transactionHash);
      }
    };

    const onError = error => {
      this.logger.debug('event : transfer failed!');
      this.logger.debug(error);
    };
    this.etherApi
      .transferERC20Token(
        walletRow.data,
        ednContractInfo,
        this.storage.coinHDAddress,
        amount,
        -1,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  async withdrawTEDN(amount: string) {
    const walletRow = this.ethWalletManager.getSelectedWallet();
    if (!walletRow) {
      alert('select wallet first!');
      return;
    }
    if (!this.storage.coinHDAddress) {
      alert('coin hd address not exists!');
      return;
    }

    if (!amount) {
      alert('invalid amount !');
      return;
    }

    try {
      ethers.utils.bigNumberify(amount);
    } catch (e) {
      this.logger.debug(e);
      alert('invalid amount !');
      return;
    }

    const walletInfo = walletRow.data;
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(amount, 18); //tedn to edn
    } catch (e) {
      alert(e);
      return;
    }

    this.logger.debug(
      adjustedAmount.toString() + '/' + adjustedAmount.toHexString()
    );

    this.ednApi
      .withdrawFromTEDN(walletInfo.address, adjustedAmount.toString())
      .then(
        result => {
          this.logger.debug(result);

          const txhash = result.data.txhash;

          this.logger.debug(txhash);

          const ethP = p.getEthersJSProvider();
          ethP.getTransaction(txhash).then(
            tx => {
              this.logger.debug(tx);
            },
            err => {
              this.logger.debug(err);
            }
          );

          this.etherApi.trackTransactionReceipt(p, txhash.trim()).then(
            (txReceipt: ethers.providers.TransactionReceipt) => {},
            err => {
              this.logger.debug(err);
              alert(err);
            }
          );
        },
        error => {
          alert(error);
        }
      );
  }

  getTEDNTransaction(pageNum, countPerPage) {
    this.ednApi.getTEDNTransaction(pageNum, countPerPage).then(
      result => {
        if (result.data) {
          this.logger.debug(result);
        }
      },
      error => {}
    );
  }
  getCoinHDAddress() {
    this.ednApi.getCoinHDAddress().then(
      result => {
        this.storage.coinHDAddress = result.data.hdaddress;
      },
      error => {}
    );
  }
  addEthAddress() {
    if (this.ethaddressToSend.trim().length < 1) {
      alert('input address to add');
      return;
    }

    this.ednApi.addEthAddress(this.ethaddressToSend).then(
      result => {
        this.getUserInfo();
      },
      error => {
        this.logger.debug(error);
      }
    );
  }

  delEthAddress() {
    if (this.ethaddressToSend.trim().length < 1) {
      alert('input address to remove');
      return;
    }

    this.ednApi.removeEthAddress(this.ethaddressToSend).then(
      result => {
        this.getUserInfo();
      },
      error => {
        this.logger.debug(error);
      }
    );
  }

  onWalletSelected() {
    this.logger.debug('wallet selected');
    this.logger.debug(this.ethWalletManager.getSelectedWallet());
    if (this.ethWalletManager.getSelectedWallet()) {
      this.ethaddressToSend = this.ethWalletManager.getSelectedWallet().data.address;
    }
  }

  /**
   *
   */
  restoreWallet() {
    const mWords = this.bip39Handler.getTrimmedMWords();
    if (mWords.length < 1) {
      alert('input mnemonic words!');
      return;
    }

    const path = this.bip39Handler.getBIP39DerivationPath();

    if (!this.ethProviderMaker.selectedWalletProviderType) {
      alert('select wallet provider!');
      return;
    }

    if (!this.ethProviderMaker.selectedWalletConnectionInfo) {
      alert('input wallet provider connection info!');
      return;
    }

    const walletInfo = this.walletService.createEthWalletInfoToStore(
      mWords,
      path,
      this.ethProviderMaker.selectedWalletProviderType,
      this.ethProviderMaker.selectedWalletConnectionInfo,
      null
    );

    this.storage.addWallet(walletInfo);
  }
}
