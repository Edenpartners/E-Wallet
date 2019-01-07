import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { NGXLogger } from 'ngx-logger';
import { IonHeader, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { NumPad } from '../../../components/numpad/num-pad';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';
import { SubscriptionPack } from '../../../utils/listutil';
import { Consts } from '../../../../environments/constants';

import { HttpClient } from '@angular/common/http';

export const EVENT_PRIVACY_POLICY_RESULT = 'privacy-policy-result';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.page.html',
  styleUrls: ['./privacy-policy.page.scss']
})
export class PrivacyPolicyPage implements OnInit {
  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  contentHtml = '';

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private angularHttp: HttpClient
  ) {}

  ngOnInit() {
    this.angularHttp
      .get('/assets/docs/privacy-policy.html', {
        responseType: 'text'
      })
      .toPromise()
      .then(
        res => {
          this.logger.debug('loaded', res);
          this.contentHtml = res;
        },
        err => {
          this.logger.debug(err);
        }
      );
  }

  ionViewWillEnter() {}

  ionViewDidLeave() {
    this.subscriptionPack.clear();
  }

  agree() {
    this.events.publish(EVENT_PRIVACY_POLICY_RESULT, true);
    this.events.publish(Consts.EVENT_CLOSE_MODAL);
  }

  disagree() {
    this.events.publish(EVENT_PRIVACY_POLICY_RESULT, false);
    this.events.publish(Consts.EVENT_CLOSE_MODAL);
  }
}
