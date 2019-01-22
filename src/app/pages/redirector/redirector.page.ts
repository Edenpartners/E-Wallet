import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { RouterService } from '../../providers/router.service';
import { NGXLogger } from 'ngx-logger';
import { SubscriptionPack } from '../../utils/listutil';

@Component({
  selector: 'app-redirector',
  templateUrl: './redirector.page.html',
  styleUrls: ['./redirector.page.scss']
})
export class RedirectorPage implements OnInit, OnDestroy {
  redirect: string = null;
  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.redirect = String(params['redirect']);
          this.tryRedirect();
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return this.rs.getRouter().events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.logger.debug('on navigation end');
        }
      });
    });
  }

  tryRedirect() {
    if (!this.redirect) {
      setTimeout(() => {
        this.tryRedirect();
      }, 100);
      return;
    }

    if (this.redirect.indexOf('/redirector') !== 0) {
      this.logger.debug('redirect to : ' + this.redirect);
      setTimeout(() => {
        //this.rs.navigateByUrl(this.redirect);
        //this.rs.goBack();

        this.rs.navigateToRoot(this.redirect);
      }, 100);
    }
  }

  ngOnDestroy() {}
  ionViewDidLeave() {
    this.subscriptionPack.clear();
  }
}
