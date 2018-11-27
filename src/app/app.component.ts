import { Component, ViewChild } from '@angular/core';

import { Platform, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { TranslateService } from '@ngx-translate/core';

import { Router, Route, UrlSegment } from '@angular/router';
import { NGXLogger } from 'ngx-logger';

import { AngularFireAuth } from '@angular/fire/auth';
import { RouterService } from './providers/router.service';
import { environment as env } from '../environments/environment';
import { AppStorageService } from './providers/appStorage.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  private userStateSubscription: Subscription;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private translate: TranslateService,
    private router: Router,
    private logger: NGXLogger,
    private afAuth: AngularFireAuth,
    private rs: RouterService,
    private storage: AppStorageService
  ) {
    translate.setDefaultLang('en');
    // translate.use('en');
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.logger.debug('platform is ready!');
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.logger.debug('current url : ' + this.router.url);
      if (
        env.config.handleUserState === false &&
        env.config.alterStartPath.length > 0
      ) {
        this.rs.goTo(env.config.alterStartPath);
      }

      this.userStateSubscription = this.storage.userStateObserver.subscribe(
        //next
        userInfo => {
          this.logger.debug(userInfo);
          if (env.config.handleUserState) {
            this.logger.debug(window.location);
            if (this.storage.isSignedIn) {
              if (this.storage.isUserInfoValidated) {
                if (!this.storage.hasPinNumber) {
                  this.logger.debug(
                    'user signed in but no pincode, goto pincode'
                  );
                  this.rs.goTo('/pc-edit');
                } else {
                  this.logger.debug('user signed in, goto home');
                  this.rs.goTo('/home');
                }
              } else {
                this.logger.debug(
                  'user signed in but no profile, goto profile'
                );
                this.rs.goTo('/signup-profile');
              }
            } else {
              this.logger.debug('user signed out, goto signin');
              this.rs.goTo('/signin');
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
}
