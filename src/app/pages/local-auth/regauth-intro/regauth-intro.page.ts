import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { NGXLogger } from 'ngx-logger';

import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { NumPad } from '../../../components/numpad/num-pad';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';
import { SubscriptionPack } from '../../../utils/listutil';
import { Consts } from '../../../../environments/constants';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { environment, env } from 'src/environments/environment';
import { Environment } from 'src/environments/environment.interface';

import { String, StringBuilder } from 'typescript-string-operations';
import { FingerprintAIO } from '@ionic-native/fingerprint-aio/ngx';

@Component({
  selector: 'app-regauth-intro',
  templateUrl: './regauth-intro.page.html',
  styleUrls: ['./regauth-intro.page.scss']
})
export class RegauthIntroPage implements OnInit {
  isFaceIDAvailable = false;

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private analytics: AnalyticsService,
    private faio: FingerprintAIO
  ) {}

  ngOnInit() {
    if (env.config.pinCode.testFaceIDFeature) {
      this.isFaceIDAvailable = true;
    } else {
      this.isFaceIDAvailable = false;
    }

    this.faio.isAvailable().then(type => {
      if (type === 'face') {
        this.isFaceIDAvailable = true;
      }
    });
  }

  onNextBtnClick() {
    this.rs.navigateByUrl('/regauth-guide');
  }
}
