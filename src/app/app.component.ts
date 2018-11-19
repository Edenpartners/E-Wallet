import { Component, ViewChild } from '@angular/core';

import { Platform, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { TranslateService } from '@ngx-translate/core';

import { Router, Route } from "@angular/router";
import { NGXLogger } from "ngx-logger";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  public rootPage: any;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private translate: TranslateService,
    private router: Router,
    private logger: NGXLogger
  ) {

    translate.setDefaultLang('en');
    // translate.use('en');
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  dumpRoutes() {
    this.printRoute('', this.router.config);
  }

  printRoute(parent: string, config: Route[]) {
    for (let i = 0; i < config.length; i++) {
      let r = config[i];
      this.logger.log(parent + '/' + r.path);
      if (r.children && r.path) {
        this.printRoute(parent + '/' + r.path, r.children);
      }
    }
  }
}