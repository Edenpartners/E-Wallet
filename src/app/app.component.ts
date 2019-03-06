import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';

import { Platform, NavController, IonMenu, ModalController, IonicModule, IonRouterOutlet } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { TranslateService } from '@ngx-translate/core';

import { Router, Route, UrlSegment, RouterEvent, NavigationEnd } from '@angular/router';

import { NGXLogger } from 'ngx-logger';

import { AngularFireAuth } from '@angular/fire/auth';
import { RouterService } from './providers/router.service';
import { env } from '../environments/environment';
import { Consts } from '../environments/constants';
import { AppStorageService, AppStorageTypes } from './providers/appStorage.service';

import { Subscription } from 'rxjs';

import { RouterPathsService } from './providers/routerPaths.service';
import { EdnRemoteApiService } from './providers/ednRemoteApi.service';
import { Events } from '@ionic/angular';
import { DataTrackerService } from './providers/dataTracker.service';
import { SubscriptionPack } from './utils/listutil';
import { TransactionLoggerService } from './providers/transactionLogger.service';
import { PinCodePage } from './pages/pin-code/pin-code/pin-code.page';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Deeplinks } from '@ionic-native/deeplinks/ngx';

import { FeedbackUIService } from './providers/feedbackUI.service';

import { IonComponentUtils } from './utils/ion-component-utils';
import { AnalyticsService } from './providers/analytics.service';
import { ModalOptions } from '@ionic/core';

const TRACKER_KEY_COINHD = 'coinHDAddress';
const TRACKER_KEY_USERINFO = 'userInfo';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  env: any;
  private envConfigText = '';

  private subscriptionPack: SubscriptionPack = new SubscriptionPack();
  private hasModal = false;
  private currentModal: HTMLIonModalElement = null;
  private isUserStateEventFired = false;

  appVersionCode: any = '';
  appVersionNumber: any = '';

  private latestDeeplink: any = null;

  private userProfileInfo: AppStorageTypes.User = null;
  private defaultUserProfileImage = 'url(\'/assets/img/default-profile-image.jpg\')';
  private lastBackButtonPressedTime = null;

  @ViewChild('sideMenu') private sideMenu: IonMenu;

  constructor(
    private appVersion: AppVersion,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private translate: TranslateService,
    private router: Router,
    private logger: NGXLogger,
    private afAuth: AngularFireAuth,
    private rs: RouterService,
    private storage: AppStorageService,
    private rPaths: RouterPathsService,
    private ednApi: EdnRemoteApiService,
    private events: Events,
    private dataTracker: DataTrackerService,
    private transactionLogger: TransactionLoggerService,
    private modalController: ModalController,
    private deeplinks: Deeplinks,
    private feedbackUI: FeedbackUIService,
    private analytics: AnalyticsService
  ) {
    this.env = env;
    this.resetEnvConfigText();
    translate.setDefaultLang('en');
    // translate.use('en');

    this.resetUserProfileInfo();
    this.initializeApp();

    //any page can attemp to open sidemenu
    this.events.subscribe(Consts.EVENT_OPEN_SIDE_MENU, () => {
      this.logger.debug(Consts.EVENT_OPEN_SIDE_MENU);
      this.sideMenu.open();
    });

    this.events.subscribe(Consts.EVENT_CONFIRM_PIN_CODE, () => {
      this.logger.debug(Consts.EVENT_CONFIRM_PIN_CODE);
      this.showPinCodeModal();
    });

    this.events.subscribe(Consts.EVENT_SHOW_MODAL, (page, params) => {
      this.logger.debug(Consts.EVENT_SHOW_MODAL);
      this.showModal(page, true, params);
    });

    this.events.subscribe(Consts.EVENT_CLOSE_MODAL, () => {
      this.logger.debug(Consts.EVENT_CLOSE_MODAL);
      this.hideModal();
    });
  }

  getUserProfileImage() {
    return this.userProfileInfo ? this.defaultUserProfileImage : this.defaultUserProfileImage;
  }

  getUserEmail() {
    if (this.userProfileInfo) {
      return this.userProfileInfo.fbUser.email;
    }
    return '';
  }

  resetUserProfileInfo() {
    this.userProfileInfo = this.storage.user;
  }

  ngOnInit() {
    if (!this.env.config.useSideMenuForDebug) {
      this.sideMenu.swipeGesture = false;
    } else {
      this.rPaths.addConfig(this.router);
      this.sideMenu.swipeGesture = true;
    }
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
    this.analytics.stopScreenLogging();
  }

  initializeApp() {
    IonComponentUtils.startWindowSizeChecker();
    this.transactionLogger.initEvents();

    this.platform.ready().then(() => {
      this.setHardwareBackButtonHandler();
      this.appVersion.getVersionCode().then(val => {
        this.appVersionCode = val;
      });

      this.appVersion.getVersionNumber().then(val => {
        this.appVersionNumber = val;
      });

      this.logger.info('platform is ready!');
      this.statusBar.styleLightContent();

      this.storage.initSqlite();
      this.storage.startFirebaseSigninCheck();
      this.handleDefaultRoute();
      this.getBaseValues();
      this.analytics.startScreenLogging();
    });
  }

  //#region Modal
  async showPinCodeModal() {
    this.showModal(PinCodePage);
  }

  async showModal(page: any, isFullScreen: boolean = true, params?: any) {
    if (this.hasModal) {
      return;
    }
    this.hasModal = true;

    const options: ModalOptions = {
      component: page
    };

    if (isFullScreen) {
      options.cssClass = 'full-screen-modal';
    }

    if (params) {
      options.componentProps = params;
    }

    this.currentModal = await this.modalController.create(options);
    return await this.currentModal.present();
  }

  async hideModal() {
    if (!this.hasModal) {
      return;
    }

    const result = await this.currentModal.dismiss();
    this.currentModal = null;
    this.hasModal = false;
  }
  //#endregion

  setHardwareBackButtonHandler() {
    //https://github.com/ionic-team/ionic/issues/15820
    this.subscriptionPack.removeSubscriptionsByKey('backButton');
    this.subscriptionPack.addSubscription(() => {
      return this.platform.backButton.subscribeWithPriority(9999, () => {
        this.logger.info('handle back button');
        this.handleHardwareBackButton();
      });
    }, 'backButton');
  }

  handleHardwareBackButton() {
    if (this.feedbackUI.hasLoading()) {
      this.logger.info('loading is appeared, ignore back-button until it ends');
      return;
    }

    if (this.feedbackUI.hasAlert()) {
      this.logger.info('has alert, ignore back-button until it ends');
      this.feedbackUI.popLastAlert();
      return;
    }

    if (this.hasModal) {
      this.hideModal();
      return;
    }

    let runExitProcess = false;
    if (this.rs.isCurrentUrlHasCustomHandler()) {
      const currentHistoryData = this.rs.getCurrentHistoryData();
      if (currentHistoryData.customBackButtonHandler()) {
        this.logger.debug('handled custom back');
        return;
      }

      this.logger.debug('has custom back but not handled');
    }

    if (this.rs.isCurrentUrlStartsWith('/home')) {
      this.logger.info('current url is home. don\'t back');
      runExitProcess = true;
    } else if (this.rs.isCurrentUrlStartsWith('/signin')) {
      this.logger.info('current url is signin. don\'t back');
      runExitProcess = true;
    } else if (this.rs.isCurrentUrlIsRoot()) {
      runExitProcess = true;
    }

    if (runExitProcess) {
      if (!this.lastBackButtonPressedTime) {
        this.lastBackButtonPressedTime = new Date().getTime();
        this.feedbackUI.showToast(this.translate.instant('ExitGuide'));
        setTimeout(() => {
          this.lastBackButtonPressedTime = null;
        }, 1000);
      } else {
        navigator['app'].exitApp();
      }
    } else {
      if (this.rs.canGoBack()) {
        this.rs.goBack();
      } else {
        this.logger.info('cannot go back!');
      }
    }
  }

  async handleDeepLink() {
    if (this.latestDeeplink) {
      this.logger.info('found deep link');

      if (
        this.storage.isSignedIn &&
        this.storage.isUserInfoValidated &&
        (!env.config.emailVerificationRequired || (env.config.emailVerificationRequired && this.storage.isUserEmailVerified))
      ) {
        // {
        //   "$link": {
        //     "path": "/deposit",
        //     "queryString": "id=user_id_hash",
        //     "fragment": "",
        //     "host": "ssl.owlfamily.net",
        //     "url": "https://ssl.owlfamily.net/deposit?id=user_id_hash",
        //     "scheme": "https"
        //   }
        // }

        try {
          const link = this.latestDeeplink.$link;
          const queryString: string = link.queryString;
          let userIdHash: string = null;

          if (queryString && queryString.indexOf('id=') >= 0) {
            const userIdParams = queryString.split('=');
            if (userIdParams.length >= 2) {
              userIdHash = userIdParams[1];
            }
          }

          let moveUrl = null;
          const linkPath = link.path;
          if (linkPath && linkPath.indexOf('/deposit') === 0) {
            moveUrl = 'tedn-deposit/_default_';
          } else if (linkPath && linkPath.indexOf('/withdraw') === 0) {
            moveUrl = 'tedn-withdraw/_default_';
          }

          const currentUserAccessToken: string = await this.ednApi.getUserAccessToken();

          this.logger.info('move to deeplink');
          if (env.config.compareUserIDTokenOnDeeplinkHandling) {
            if (
              currentUserAccessToken &&
              userIdHash &&
              currentUserAccessToken.toLowerCase().trim() === userIdHash.toLowerCase().trim() &&
              moveUrl
            ) {
              this.rs.navigateByUrl(moveUrl);
            }
          } else if (moveUrl) {
            this.rs.navigateByUrl(moveUrl);
          }
        } catch (e) {
          this.logger.info(e);
        }
      } else {
        this.logger.info('there is no user signed-in. just ignore deeplink');
      }
    }

    this.latestDeeplink = null;
  }

  resubscribeDeeplink() {
    if (!this.platform.is('cordova')) {
      return;
    }

    this.subscriptionPack.removeSubscriptionsByKey('deeplink');
    this.subscriptionPack.addSubscription(() => {
      //will not use automatic-routing. for handling with user's sign-in statement
      return this.deeplinks.route([]).subscribe(
        deepLinkMatch => {
          //this will not happen
          this.logger.info('deep link match', deepLinkMatch.$args, deepLinkMatch.$route, deepLinkMatch.$link);
          this.resubscribeDeeplink();
        },

        deepLinkNotMatch => {
          // handle deep link from here.
          this.logger.info('deep link not match');
          this.logger.debug(deepLinkNotMatch);

          if (deepLinkNotMatch.$link) {
            this.latestDeeplink = deepLinkNotMatch;
          }
          if (this.isUserStateEventFired) {
            this.handleDeepLink();
          }

          this.resubscribeDeeplink();
        },
        //complete
        () => {
          this.logger.info('deep link subscription complete');
        }
      );
    }, 'deeplink');
  }

  handleDefaultRoute() {
    this.logger.debug('current url : ' + this.router.url);
    if (env.config.handleUserState === false && env.config.alterStartPath.length > 0) {
      this.rs.navigateByUrl(env.config.alterStartPath);
    }

    this.resubscribeDeeplink();

    this.subscriptionPack.addSubscription(() => {
      return this.storage.userStateObserver.subscribe(
        //next
        userInfo => {
          this.logger.debug('user state changed');

          if (env.config.emailVerificationRequired) {
            this.hideEmailVerificationPopupLoading();
          }

          const isFirstUserStateEvent = this.isUserStateEventFired === true ? false : true;

          this.isUserStateEventFired = true;
          //start tracking incomplete tx logs
          if (this.storage.isSignedIn) {
            this.transactionLogger.trackUnclosedTxLogs();
          }

          this.resetUserProfileInfo();

          this.logger.debug(userInfo);
          if (env.config.handleUserState) {
            if (isFirstUserStateEvent) {
              const navSubscription = this.rs.getRouter().events.subscribe(event => {
                if (event instanceof NavigationEnd) {
                  this.logger.debug('on navigation end');
                  setTimeout(() => {
                    this.splashScreen.hide();
                    this.handleDeepLink();
                  }, 1000);
                  navSubscription.unsubscribe();
                }
              });
            }

            this.logger.debug(window.location);
            let gotoSignin = false;

            if (this.storage.isSignedIn) {
              this.getBaseValues();

              if (this.storage.isUserInfoValidated) {
                if (!env.config.emailVerificationRequired || this.storage.isUserEmailVerified) {
                  if (!this.storage.hasPinNumber) {
                    this.logger.info('user signed in but no pincode, goto pincode');
                    this.rs.navigateToRoot('/pin-code?isCreation=true');
                  } else {
                    this.logger.info('user signed in, goto home');
                    this.rs.navigateToRoot('/home');
                  }
                } else {
                  if (userInfo.fbUser.metadata.lastSignInTime === userInfo.fbUser.metadata.creationTime && !isFirstUserStateEvent) {
                    this.sendEmailVerification(userInfo, (error: any) => {
                      if (error) {
                        this.feedbackUI.showToast(error);
                      } else {
                        this.feedbackUI.showToast(this.translate.instant('EmailVerificationSendingFailed'));
                      }
                      this.showEmailVerificationPopup(userInfo);
                    });
                  } else {
                    this.showEmailVerificationPopup(userInfo);
                  }
                }
              } else {
                this.logger.info('user signed in but no profile. isFirstUserStateEvent ? ' + isFirstUserStateEvent);
                if (isFirstUserStateEvent) {
                  this.signout();
                } else {
                  this.rs.navigateByUrl('/signup-profile');
                }
              }
            } else {
              this.stopBaseValuesTracking();
              gotoSignin = true;
              this.logger.info('user signed out, goto signin');
            }

            if (gotoSignin) {
              if (isFirstUserStateEvent) {
                this.rs.navigateToRoot('/signin');
              } else {
                this.rs.navigateToRoot('/signin', true);
              }
            }
          } else {
            if (isFirstUserStateEvent) {
              this.splashScreen.hide();
            }

            if (env.config.useRedirectorOnDebugMode) {
              const currentUrl = this.rs.getRouter().url;

              if (currentUrl !== '/' && currentUrl.indexOf('/redirector') !== 0) {
                this.logger.debug('reload current url : ' + currentUrl);
                //this.rs.navigateByUrl(currentUrl);
                this.rs.navigate(['redirector', currentUrl]);
              }
            }
          }
        },
        //error
        error => {},
        //complete
        () => {}
      );
    });
  }

  hideEmailVerificationPopupLoading() {
    this.feedbackUI.hideLoading('email-verification-popup');
  }
  showEmailVerificationPopupLoading() {
    this.feedbackUI.showLoading(null, 'email-verification-popup');
  }

  startSigninCheckAgain() {
    setTimeout(() => {
      this.storage.startFirebaseSigninCheck();
    }, 1000);
  }

  showEmailVerificationPopup(userInfo: AppStorageTypes.User) {
    const signoutAction = {
      text: this.translate.instant('Cancel'),
      role: 'cancel',
      cssClass: 'dialog-button-text-align-center',
      handler: () => {
        this.showEmailVerificationPopupLoading();
        this.signout();
      }
    };

    const retryVerificationCheckAction = {
      text: this.translate.instant('Retry'),
      cssClass: 'dialog-button-text-align-center',
      handler: () => {
        this.showEmailVerificationPopupLoading();
        this.startSigninCheckAgain();
      }
    };

    this.splashScreen.hide();
    this.feedbackUI.showAlertDialog({
      title: null,
      cssClass: 'dialog-button-text-align-center',
      cancelDisabled: true,
      backdropDismiss: false,
      message: `${this.translate.instant('valid.email.verification')}<br><b>${userInfo.fbUser.email}</b>`,
      buttons: [
        signoutAction,
        {
          text: this.translate.instant('SendEmailVerification'),
          cssClass: 'dialog-button-text-align-center',
          handler: () => {
            this.sendEmailVerification(userInfo);
          }
        }
      ]
    });
  }

  sendEmailVerification(userInfo: AppStorageTypes.User, onError: (error: any) => void = null) {
    this.showEmailVerificationPopupLoading();

    userInfo.fbUser.sendEmailVerification().then(
      () => {
        this.hideEmailVerificationPopupLoading();
        this.feedbackUI.showAlertDialog({
          title: null,
          message: this.translate.instant('EmailVerificationSent'),
          cancelDisabled: true
        });
        this.signout();
      },
      err => {
        this.hideEmailVerificationPopupLoading();
        if (onError) {
          onError(err);
        } else {
          if (err) {
            this.feedbackUI.showToast(err);
          } else {
            this.feedbackUI.showToast(this.translate.instant('EmailVerificationSendingFailed'));
          }

          this.startSigninCheckAgain();
        }
      }
    );
  }

  stopBaseValuesTracking() {
    this.subscriptionPack.removeSubscriptionsByKey(TRACKER_KEY_COINHD);
    this.dataTracker.stopTracker(TRACKER_KEY_COINHD, true);

    this.subscriptionPack.removeSubscriptionsByKey(TRACKER_KEY_USERINFO);
    this.dataTracker.stopTracker(TRACKER_KEY_USERINFO, true);
  }

  getBaseValues() {
    this.stopBaseValuesTracking();
    const coinHDAddressTracker = this.dataTracker.startTracker(TRACKER_KEY_COINHD, () => {
      return new Promise<any>((finalResolve, finalReject) => {
        this.ednApi.getCoinHDAddress().then(
          result => {
            if (result && result.data && result.data.hdaddress) {
              finalResolve(result.data.hdaddress);
            } else {
              finalReject(new Error('unknown error'));
            }
          },
          error => {
            finalReject(error);
          }
        );
      });
    });

    coinHDAddressTracker.interval = 1000;

    //refresh coinHDaddress
    this.subscriptionPack.addSubscription(() => {
      return coinHDAddressTracker.trackObserver.subscribe(hdaddress => {
        this.storage.coinHDAddress = hdaddress;
        this.dataTracker.stopTracker(TRACKER_KEY_COINHD, true);
        this.subscriptionPack.removeSubscriptionsByKey(TRACKER_KEY_COINHD);
      });
    }, TRACKER_KEY_COINHD);

    //refresh latest userInfo
    if (this.storage.isSignedIn) {
      const userInfoTracker = this.dataTracker.startTracker(TRACKER_KEY_USERINFO, () => {
        return new Promise<any>((finalResolve, finalReject) => {
          this.ednApi.getUserInfo().then(
            userInfoResult => {
              if (userInfoResult.data) {
                finalResolve(userInfoResult.data);
              } else {
                finalReject(new Error('unknown error'));
              }
            },
            err => {
              finalReject(err);
            }
          );
        });
      });

      userInfoTracker.interval = 1000;
      this.subscriptionPack.addSubscription(() => {
        return userInfoTracker.trackObserver.subscribe(userInfo => {
          this.storage.userInfo = userInfo;
          this.dataTracker.stopTracker(TRACKER_KEY_USERINFO, true);
          this.subscriptionPack.removeSubscriptionsByKey(TRACKER_KEY_USERINFO);
        });
      }, TRACKER_KEY_USERINFO);
    }
  }

  dumpRoutes() {
    this.printRoute('', this.router.config);
  }

  printRoute(parent: string, config: Route[]) {
    for (let i = 0; i < config.length; i++) {
      const r = config[i];
      this.logger.log(parent + '/' + r.path);
      if (r.children && r.path) {
        this.printRoute(parent + '/' + r.path, r.children);
      }
    }
  }

  signout() {
    this.analytics.logEvent({
      category: 'main',
      params: {
        action: 'sign out click',
        event_label: 'sign out_sign out click'
      }
    });

    this.feedbackUI.showLoading(null, 'signout');
    this.sideMenu.close();
    this.ednApi.signout().finally(() => {
      this.ednApi
        .signoutFirebase()
        .then(() => {})
        .finally(() => {
          this.storage.wipeData();
          this.feedbackUI.hideLoading('signout');
        });
    });
  }

  resetEnvConfigText() {
    try {
      this.envConfigText = JSON.stringify(this.env.config);
    } catch (e) {
      this.logger.debug(e);
    }
  }

  chagngeEnvConfig() {
    try {
      const envConfig = JSON.parse(this.envConfigText);
      env.config = envConfig;
    } catch (e) {
      this.logger.debug(e);
    }
  }

  navigateToUrlBySideMenu(url: string) {
    this.rs.navigateByUrl(url);
  }
}
