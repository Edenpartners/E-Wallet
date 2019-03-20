import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { AppStorageService } from '../../providers/appStorage.service';
import { Subscription } from 'rxjs';

import { ethers, Wallet, Contract } from 'ethers';

import { WalletService } from '../../providers/wallet.service';

import { Bip39Handler } from '../../components/testers/bip39-handler';
import { EthProviderMaker } from '../../components/testers/eth-provider-maker';
import { EthWalletManager } from '../../components/testers/eth-wallet-manager';
import { BigNumber } from 'ethers/utils';
import { EtherApiService } from '../../providers/etherApi.service';
import { EtherDataService } from '../../providers/etherData.service';

import { EthService, EthProviders } from '../../providers/ether.service';
import { env } from '../../../environments/environment';
import { Consts } from '../../../environments/constants';

import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

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

  private currentPinCode = '';
  private oldPinCode = '';
  private tdenTransactionList = [];

  showChecker = false;

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
    private eths: EthService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
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

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
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

  ionViewDidLeave() {
    this.logger.debug('ethtest component destroyed');
    if (this.userStateSubscription && this.userStateSubscription.closed === false) {
      this.userStateSubscription.unsubscribe();
      this.userStateSubscription = null;
    }
  }

  isSignedIn(): boolean {
    return this.storage.isSignedIn;
  }

  setPinCode() {
    if (this.currentPinCode.length === 6) {
      this.storage.setPinCode(this.currentPinCode, true, this.oldPinCode);
      this.ethWalletManager.refreshList(true);
    } else {
      this.feedbackUI.showErrorDialog('pin code error!');
    }
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
          this.feedbackUI.showErrorDialog(fbError.message);
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
          this.feedbackUI.showErrorDialog(fbError.message);
        }
      }
    );
  }

  runEdnSignup() {
    const loading = this.feedbackUI.showRandomKeyLoading();

    let signupPromise;
    if (env.config.patches.useSigninForSignup) {
      signupPromise = this.ednApi.signin();
    } else {
      signupPromise = this.ednApi.signup();
    }

    const onFailed = (error: any) => {
      this.feedbackUI.showErrorAndRetryDialog(
        error,
        () => {
          this.runEdnSignup();
        },
        () => {}
      );
    };
    signupPromise.then(
      ednResult => {
        this.logger.debug('edn signin success !', ednResult);

        if (ednResult.data && ednResult.data.email) {
          this.storage.userInfo = ednResult.data;
          loading.hide();
        } else {
          this.ednApi
            .getUserInfo()
            .then(
              userInfoResult => {
                if (userInfoResult.data) {
                  this.storage.userInfo = userInfoResult.data;
                } else {
                  onFailed(new Error());
                }
              },
              userInfoError => {
                this.logger.debug(userInfoError);
                this.logger.debug('userInfoError !');
                onFailed(userInfoError);
              }
            )
            .finally(() => {
              loading.hide();
            });
        }
      },
      ednError => {
        loading.hide();

        this.logger.debug(ednError);
        this.logger.debug('edn signup failed !');

        onFailed(ednError);
      }
    );

    this.logger.debug('run edn signup');
  }

  runEdnSignin() {
    let signinPromise;
    if (env.config.patches.useSignupForSignin) {
      signinPromise = this.ednApi.signup();
    } else {
      signinPromise = this.ednApi.signin();
    }

    return new Promise<any>((finalResolve, finalReject) => {
      signinPromise.then(
        ednResult => {
          this.logger.debug('edn signin success !', ednResult);

          if (ednResult.data && ednResult.data.email) {
            this.storage.userInfo = ednResult.data;
            finalResolve();
          } else {
            this.ednApi.getUserInfo().then(
              userInfoResult => {
                if (userInfoResult.data) {
                  this.storage.userInfo = userInfoResult.data;
                  finalResolve();
                } else {
                  finalReject(new Error());
                }
              },
              userInfoError => {
                this.logger.debug(userInfoError);
                this.logger.debug('userInfoError !');
                finalReject(userInfoError);
              }
            );
          }
        },
        ednError => {
          finalReject(ednError);
          this.logger.debug(ednError);
          this.logger.debug('edn signin failed !');
        }
      );
    });
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
          this.feedbackUI.showErrorDialog(fbError.message);
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
          this.feedbackUI.showErrorDialog(error.message);
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
          this.feedbackUI.showErrorDialog(error.message);
        }
      }
    );
  }

  fetchFirebaseSigninInfo(userId: string) {
    this.ednApi.fetchFirebaseSigninInfo(userId).then(
      result => {},
      error => {
        if (error.message) {
          this.feedbackUI.showErrorDialog(error.message);
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
        this.feedbackUI.showErrorDialog('ok');
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
        this.tednBalance = ethers.utils.formatUnits(resultData.data.amount, Consts.TEDN_DECIMAL);
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
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  depositTEDN(amount: string) {
    const walletRow = this.ethWalletManager.getSelectedWallet();
    if (!walletRow) {
      this.feedbackUI.showErrorDialog('select wallet first!');
      return;
    }
    if (!this.storage.coinHDAddress) {
      this.feedbackUI.showErrorDialog('coin hd address not exists!');
      return;
    }

    if (!amount) {
      this.feedbackUI.showErrorDialog('invalid amount !');
      return;
    }

    try {
      ethers.utils.bigNumberify(amount);
    } catch (e) {
      this.logger.debug(e);
      this.feedbackUI.showErrorDialog('invalid amount !');
      return;
    }

    const walletInfo = walletRow.data;
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(amount, ednContractInfo.contractInfo.decimal);
    } catch (e) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.amount.pattern'));
      return;
    }

    const pinCode = this.storage.getPinCodeWithValidate(this.currentPinCode);
    if (pinCode === null) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.areEqual'));
      return;
    }

    this.logger.debug('========= DEPOSIT ========== ');
    this.logger.debug(ednContractInfo);
    this.logger.debug(amount);
    const onTransactionCreate = tx => {};

    const onTransactionReceipt = txReceipt => {
      this.logger.log('transaction receipt');
      this.logger.log(txReceipt);
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
        {
          walletInfo: walletRow.data,
          ctInfo: ednContractInfo,
          toAddress: this.storage.coinHDAddress,
          srcAmount: adjustedAmount
        },
        pinCode,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  async withdrawTEDN(amount: string) {
    const walletRow = this.ethWalletManager.getSelectedWallet();
    if (!walletRow) {
      this.feedbackUI.showErrorDialog('select wallet first!');
      return;
    }
    if (!this.storage.coinHDAddress) {
      this.feedbackUI.showErrorDialog('coin hd address not exists!');
      return;
    }

    if (!amount) {
      this.feedbackUI.showErrorDialog('invalid amount !');
      return;
    }

    try {
      ethers.utils.bigNumberify(amount);
    } catch (e) {
      this.logger.debug(e);
      this.feedbackUI.showErrorDialog('invalid amount !');
      return;
    }

    const walletInfo = walletRow.data;
    const p: EthProviders.Base = this.eths.getProvider(walletInfo.info.provider);

    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(env.config.ednCoinKey, p);

    // convert to
    let adjustedAmount: BigNumber = null;
    try {
      adjustedAmount = ethers.utils.parseUnits(amount, Consts.TEDN_DECIMAL); //tedn to edn
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
      return;
    }

    this.logger.debug(adjustedAmount.toString() + '/' + adjustedAmount.toHexString());

    this.ednApi.withdrawFromTEDN(walletInfo.address, adjustedAmount.toString()).then(
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
            this.feedbackUI.showErrorDialog(err);
          }
        );
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
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
    const targetWallet = this.ethWalletManager.getSelectedWallet();
    if (!targetWallet) {
      this.feedbackUI.showErrorDialog('select wallet to add');
      return;
    }

    const pinCode = this.storage.getPinCode();
    const w: Wallet = this.walletService.createEthWalletInstance(targetWallet.data, pinCode);

    if (!w) {
      this.feedbackUI.showErrorDialog('invalid wallet');
      return;
    }

    this.ednApi.addEthAddress(this.ednApi.utils.createEthAddressObject(w)).then(
      result => {
        this.storage.addEthAddressToUserInfoTemporary(targetWallet.data.address);
        this.getUserInfo();
      },
      error => {
        this.logger.debug(error);
      }
    );
  }

  delEthAddress() {
    const targetWallet = this.ethWalletManager.getSelectedWallet();
    if (!targetWallet) {
      this.feedbackUI.showErrorDialog('select wallet to remove');
      return;
    }

    const pinCode = this.storage.getPinCode();
    const w: Wallet = this.walletService.createEthWalletInstance(targetWallet.data, pinCode);

    if (!w) {
      this.feedbackUI.showErrorDialog('invalid wallet');
      return;
    }

    this.ednApi.removeEthAddress(this.ednApi.utils.createEthAddressObject(w)).then(
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
  }

  /**
   *
   */
  restoreWallet() {
    const mWords = this.bip39Handler.getTrimmedMWords();
    if (mWords.length < 1) {
      this.feedbackUI.showErrorDialog('input mnemonic words!');
      return;
    }

    const path = this.bip39Handler.getBIP39DerivationPath();

    if (!this.ethProviderMaker.selectedWalletProviderType) {
      this.feedbackUI.showErrorDialog('select wallet provider!');
      return;
    }

    if (!this.ethProviderMaker.selectedWalletConnectionInfo) {
      this.feedbackUI.showErrorDialog('input wallet provider connection info!');
      return;
    }

    const pinCode = this.storage.getPinCodeWithValidate(this.currentPinCode);
    if (!pinCode) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.areEqual'));
      return;
    }

    const walletInfo = this.walletService.createEthWalletInfoToStore(
      mWords,
      path,
      this.ethProviderMaker.selectedWalletProviderType,
      this.ethProviderMaker.selectedWalletConnectionInfo,
      pinCode
    );

    this.storage.addWallet(walletInfo);
  }
}
