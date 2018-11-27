import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../providers/router.service';

import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { AppStorageService } from '../providers/appStorage.service';

@Component({
  selector: 'user-state-checker',
  template: `
    <div></div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class UserStateChecker implements OnInit, OnDestroy {
  constructor(
    private rs: RouterService,
    private logger: NGXLogger,
    private storage: AppStorageService
  ) {}
  private userStateSubscription: Subscription;

  ngOnInit() {
    const logger = this.logger;
    this.logger.debug('UserStateChecker component init');
    this.userStateSubscription = this.storage.userStateObserver.subscribe(
      //next
      userInfo => {
        logger.debug('UserStateChecker : user state change', userInfo);
      },
      //error
      error => {
        logger.debug('user state error');
      },
      //complete
      () => {
        logger.debug('user state complete');
      }
    );
  }

  ngOnDestroy() {
    this.logger.debug('UserStateChecker component destroyed');
    if (
      this.userStateSubscription &&
      this.userStateSubscription.closed === false
    ) {
      this.logger.debug('UserStateChecker call unsubscribe');
      this.userStateSubscription.unsubscribe();
      this.userStateSubscription = null;
    }
  }
}
