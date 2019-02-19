import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { FirebaseAnalytics } from '@ionic-native/firebase-analytics/ngx';
import { env } from '../../environments/environment';
import { SubscriptionPack } from '../utils/listutil';
import { Router, Route, UrlSegment, RouterEvent, NavigationEnd } from '@angular/router';
import { RouterService } from './router.service';

export interface AnalyticsEvent {
  category: string;
  params: {
    action: string;
    event_label: string;
    value?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(private logger: NGXLogger, private fba: FirebaseAnalytics, private rs: RouterService, private router: Router) {
    this.logger.debug('set analytics enabled : ' + env.config.firebaseFeatures.analytics);
    this.fba.setEnabled(env.config.firebaseFeatures.analytics);
  }

  ngOnInit() {}

  ngOnDestroy() {}

  startScreenLogging() {
    this.subscriptionPack.addSubscription(() => {
      return this.router.events.subscribe((e: RouterEvent) => {
        if (e instanceof NavigationEnd) {
          this.logger.debug('router event : ', e);
          const regexExp = /\/([a-zA-Z\-_0-9]*)\/?.*/;
          const match = regexExp.exec(e.url);
          let path: string = null;
          if (match != null && match.length > 1) {
            path = match[1];
          }
          if (path !== null && path.length > 0) {
            this.logger.debug('found path : ', path);
            this.logPage(path);
          }
        }
      });
    }, 'routerEvent');
  }

  stopScreenLogging() {
    this.subscriptionPack.removeSubscriptionsByKey('routerEvent');
  }

  setUserId(userId: string) {}

  logEvent(event: AnalyticsEvent) {
    this.logger.debug('analytics og event : ', event.category, event.params);
    this.fba.logEvent(event.category, event.params);
  }

  logPage(pageName: string) {
    this.logger.debug('analytics log screen : ', pageName);
    this.fba.setCurrentScreen(pageName);
  }
}
