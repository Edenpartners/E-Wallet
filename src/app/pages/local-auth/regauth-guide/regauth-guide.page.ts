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
  selector: 'app-regauth-guide',
  templateUrl: './regauth-guide.page.html',
  styleUrls: ['./regauth-guide.page.scss']
})
export class RegauthGuidePage implements OnInit {
  isFinished = false;
  isFaceIDAvailable = false;

  titleText = '';

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
      this.setFaceIDAvailable(true);
    } else {
      this.setFaceIDAvailable(false);
    }
    this.faio.isAvailable().then(type => {
      if (type === 'face') {
        this.setFaceIDAvailable(true);
      }
    });
  }

  setFaceIDAvailable(val: boolean) {
    this.isFaceIDAvailable = val;
    if (val) {
      this.titleText = this.translate.instant('FaceID');
    } else {
      this.titleText = this.translate.instant('TouchID');
    }
    this.logger.debug('face id available');
    this.logger.debug(this.titleText);
  }

  onLaterBtnClick() {
    this.rs.navigateByUrl('/pin-code?isCreation=true');
  }

  onUsingBtnClick() {
    this.faio.show(Consts.FINGER_PRINT_OPTIONS).then(
      result => {
        //android's result is like this but it's not an from Android offical API. it's just plugin's features.
        //{ "withFingerprint": "QtdRCqUmh3sm9jFVfiiZeg==\n" }
        //ios does not have any result

        this.logger.debug('fingerprint success');
        this.logger.debug(result);

        const prefs = this.storage.preferences;
        prefs.useFingerprintAuth = true;
        this.storage.preferences = prefs;
        this.isFinished = true;
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  onNextBtnClick() {
    this.rs.navigateByUrl('/pin-code?isCreation=true');
  }
}
