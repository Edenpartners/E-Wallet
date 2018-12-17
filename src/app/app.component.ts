import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';

import { Platform, NavController, Menu, ModalController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { TranslateService } from '@ngx-translate/core';

import {
  Router,
  Route,
  UrlSegment,
  RouterEvent,
  NavigationEnd
} from '@angular/router';
import { NGXLogger } from 'ngx-logger';

import { AngularFireAuth } from '@angular/fire/auth';
import { RouterService } from './providers/router.service';
import { env } from '../environments/environment';
import { Consts } from '../environments/constants';
import { AppStorageService } from './providers/appStorage.service';
import { Subscription } from 'rxjs';
import { RouterPathsService } from './providers/routerPaths.service';
import { EdnRemoteApiService } from './providers/ednRemoteApi.service';
import { Events } from '@ionic/angular';
import { DataTrackerService } from './providers/dataTracker.service';
import { SubscriptionPack } from './utils/listutil';
import { TransactionLoggerService } from './providers/transactionLogger.service';
import { PcEditPage } from './pages/pin-code/pc-edit/pc-edit.page';
import { AppVersion } from '@ionic-native/app-version/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  private env: any;
  private envConfigText = '';

  private subscriptionPack: SubscriptionPack = new SubscriptionPack();
  private hasModal = false;
  private currentModal: HTMLIonModalElement = null;
  private isFirstUserStateEvent = true;

  private appVersionCode: any = '';
  private appVersionNumber: any = '';

  @ViewChild('sideMenu') private sideMenu: Menu;

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
    private modalController: ModalController
  ) {
    this.env = env;
    this.resetEnvConfigText();
    translate.setDefaultLang('en');
    // translate.use('en');

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

    this.events.subscribe(Consts.EVENT_CLOSE_MODAL, () => {
      this.logger.debug(Consts.EVENT_CLOSE_MODAL);
      this.hidePinCodeModal();
    });
  }

  async showPinCodeModal() {
    if (this.hasModal) {
      return;
    }
    this.hasModal = true;

    this.currentModal = await this.modalController.create({
      component: PcEditPage
    });
    return await this.currentModal.present();
  }

  async hidePinCodeModal() {
    if (!this.hasModal) {
      return;
    }

    const result = await this.currentModal.dismiss();
    this.currentModal = null;
    this.hasModal = false;
  }

  ngOnInit() {
    if (!this.env.config.useSideMenuForDebug) {
      this.sideMenu.swipeGesture = false;
    } else {
      this.rPaths.addConfig(this.router);
      this.sideMenu.swipeGesture = true;
    }

    this.router.events.subscribe((e: RouterEvent) => {});
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  initializeApp() {
    this.transactionLogger.initEvents();

    this.platform.ready().then(() => {
      this.appVersion.getVersionCode().then(val => {
        this.appVersionCode = val;
      });

      this.appVersion.getVersionNumber().then(val => {
        this.appVersionNumber = val;
      });

      this.logger.debug('platform is ready!');
      this.statusBar.styleDefault();

      this.storage.startFirebaseSigninCheck();
      this.handleDefaultRoute();
      this.getBaseValues();
    });
  }

  handleDefaultRoute() {
    this.logger.debug('current url : ' + this.router.url);
    if (
      env.config.handleUserState === false &&
      env.config.alterStartPath.length > 0
    ) {
      this.rs.navigateByUrl(env.config.alterStartPath);
    }

    this.subscriptionPack.addSubscription(() => {
      return this.storage.userStateObserver.subscribe(
        //next
        userInfo => {
          const isFirstUserStateEvent = this.isFirstUserStateEvent;
          this.isFirstUserStateEvent = false;
          //start tracking incomplete tx logs
          if (this.storage.isSignedIn) {
            this.transactionLogger.trackUnclosedTxLogs();
          }

          this.logger.debug(userInfo);
          if (env.config.handleUserState) {
            if (isFirstUserStateEvent) {
              const navSubscription = this.rs
                .getRouter()
                .events.subscribe(event => {
                  if (event instanceof NavigationEnd) {
                    this.logger.debug('on navigation end');
                    setTimeout(() => {
                      this.splashScreen.hide();
                    }, 1000);
                    navSubscription.unsubscribe();
                  }
                });
            }

            this.logger.debug(window.location);
            if (this.storage.isSignedIn) {
              if (this.storage.isUserInfoValidated) {
                if (!this.storage.hasPinNumber) {
                  this.logger.debug(
                    'user signed in but no pincode, goto pincode'
                  );
                  this.rs.navigateByUrl('/pc-edit?isCreation=true');
                } else {
                  this.logger.debug('user signed in, goto home');
                  this.rs.navigateByUrl('/home');
                }
              } else {
                this.logger.debug(
                  'user signed in but no profile, goto profile'
                );
                this.rs.navigateByUrl('/signup-profile');
              }
            } else {
              this.logger.debug('user signed out, goto signin');
              this.rs.navigateByUrl('/signin');
            }
          } else {
            if (isFirstUserStateEvent) {
              this.splashScreen.hide();
            }

            if (env.config.useRedirectorOnDebugMode) {
              const currentUrl = this.rs.getRouter().url;
              if (
                currentUrl !== '/' &&
                currentUrl.indexOf('/redirector') !== 0
              ) {
                this.logger.debug('reload current url : ' + currentUrl);
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

  getBaseValues() {
    const trackKey = 'coinHDAddress';
    const coinHDAddressTracker = this.dataTracker.startTracker(trackKey, () => {
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

    //resolve address only once.
    this.subscriptionPack.addSubscription(() => {
      return coinHDAddressTracker.trackObserver.subscribe(hdaddress => {
        this.storage.coinHDAddress = hdaddress;
        this.dataTracker.stopTracker(trackKey, true);
        this.subscriptionPack.removeSubscriptionsByKey(trackKey);
      });
    }, trackKey);
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
    this.sideMenu.close();
    this.ednApi.signout().finally(() => {
      this.ednApi.signoutFirebase().then(() => {
        this.storage.wipeData();
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
}
