import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute, ParamMap } from '@angular/router';

import { NGXLogger } from 'ngx-logger';

import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';

import { NumPad } from '../../../components/numpad/num-pad';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';
import { SubscriptionPack } from '../../../utils/listutil';
import { Consts } from '../../../../environments/constants';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { environment } from 'src/environments/environment';
import { Environment } from 'src/environments/environment.interface';

import { String, StringBuilder } from 'typescript-string-operations';
import { FingerprintAIO } from '@ionic-native/fingerprint-aio/ngx';

const AnalyticsCategory = 'confirm pin';

@Component({
  selector: 'app-pin-code',
  templateUrl: './pin-code.page.html',
  styleUrls: ['./pin-code.page.scss']
})
export class PinCodePage implements OnInit, OnDestroy {
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
  ) {
    this.logger.trace('init pin-code');
    this.env = environment;
  }

  @ViewChild(NumPad) numPad: NumPad;

  isModal = false;
  isCreation = false;
  isConfirmStep = true;
  isComplete = false;

  isBlocked = false;

  isFingerPrintMode = false;
  isFingerPrintEnabled = false;

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  env: Environment;

  nextPinCodeEnableRemainTimeCalculator = null;
  nextPinCodeEnableRemainTime = 0;
  nextPinCodeEnableRemainTimeDisplay = '0';

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.checkPinCodeOverFailedState();

    this.isModal = false;
    this.isCreation = false;
    this.isConfirmStep = true;
    this.isComplete = false;
    this.numPad.clear();

    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.queryParamMap.subscribe((query: ParamMap) => {
        try {
          if (query.get('isCreation') !== undefined && query.get('isCreation') !== null) {
            const creationVal = query.get('isCreation');
            this.isCreation = creationVal === 'true' ? true : false;
            this.logger.debug('isCreation : ', this.isCreation);
            if (this.isCreation) {
              this.isConfirmStep = false;

              this.logger.debug('add custom back handler');
              this.rs.addCustomBackHandler('pin-code', () => {
                return this.handleBack();
              });
            }
          } else {
            this.isModal = true;

            const onFingerPrintAvailable = () => {
              this.isFingerPrintEnabled = true;
              if (this.storage.preferences.useFingerprintAuth || this.env.config.pinCode.testFingerprintFeature) {
                this.setFingerPrintMode(true);
              } else {
                this.setFingerPrintMode(false);
              }
            };

            if (this.env.config.pinCode.testFingerprintFeature) {
              onFingerPrintAvailable();
            } else {
              this.faio.isAvailable().then(
                () => {
                  onFingerPrintAvailable();
                },
                () => {
                  this.isFingerPrintEnabled = false;
                  this.setFingerPrintMode(false);
                }
              );
            }
          }
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ionViewWillLeave() {
    this.clearNextPinCodeEnableRemainTimeCalculator();
  }

  ionViewDidLeave() {
    this.subscriptionPack.clear();
    this.numPad.clear();
  }

  isBackButtonHidden(): boolean {
    if (this.isCreation) {
      if (this.isConfirmStep) {
        return false;
      }

      if (this.rs.isCurrentUrlIsRoot()) {
        return true;
      }
    }

    return false;
  }

  handleBack(): boolean {
    this.logger.debug('handle back customized');

    if (this.isModal) {
      this.events.publish(Consts.EVENT_PIN_CODE_RESULT, null);
      this.events.publish(Consts.EVENT_CLOSE_MODAL);
      return true;
    } else {
      if (this.isCreation) {
        if (this.isConfirmStep) {
          this.logger.debug('restart creation');
          //restart creation
          this.isConfirmStep = false;
          this.numPad.clear();
          return true;
        }

        if (this.rs.isCurrentUrlIsRoot()) {
          this.logger.debug('this is root url will stay here');
          return true;
        } else {
          this.logger.debug('this is not an root url goto back');
          if (this.rs.canGoBack()) {
            this.rs.goBack();
          }
        }
      }
    }

    return false;
  }

  onCreatePinBtnClick() {
    if (this.numPad.getUserInputCount() !== Consts.PIN_CODE_LENGTH) {
      return;
    }

    this.numPad.saveCurrentInputAndReset();
    this.isConfirmStep = true;
  }

  performAuthSuccess() {
    this.storage.pinCodeFailedCount = 0;
    this.storage.nextPinCodeEnableTime = null;

    this.events.publish(Consts.EVENT_PIN_CODE_RESULT, this.storage.getPinCode());
    this.isComplete = true;
    this.events.publish(Consts.EVENT_CLOSE_MODAL);
  }

  onNumChange() {
    //save to localStorage if creation mode
    if (this.isCreation) {
      if (this.isConfirmStep) {
        if (this.numPad.getUserInputCount() === Consts.PIN_CODE_LENGTH) {
          if (this.numPad.compareWithSavedInput()) {
            this.storage.setPinCode(this.numPad.getDecryptedUserInput(), true, '');
            this.numPad.clear();
            this.isComplete = true;
            this.storage.notifyToUserStateObservers();
          } else {
            this.numPad.clearPinCode();
            this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.areEqual'));
          }
        }
      }
    } else if (this.isConfirmStep) {
      if (this.numPad.getUserInputCount() === Consts.PIN_CODE_LENGTH) {
        this.analytics.logEvent({
          category: AnalyticsCategory,
          params: {
            action: 'pin no click',
            event_label: 'pin no_pin no click'
          }
        });

        const code = this.numPad.getDecryptedUserInput();
        this.numPad.clearPinCode();
        if (this.storage.isValidPinCode(code)) {
          this.performAuthSuccess();
        } else {
          this.storage.pinCodeFailedCount = this.storage.pinCodeFailedCount + 1;
          if (this.isPinCodeOverFailed()) {
            const failedOffsetTime = 30000;
            const overFailedCount = this.storage.pinCodeFailedCount - this.env.config.pinCode.maxPinCodeRetryCount;

            let nextOffsetTime = failedOffsetTime;
            //30 , 60 , 120 , 240
            for (let i = 0; i < overFailedCount; i++) {
              nextOffsetTime = nextOffsetTime * 2;
            }

            const now = new Date();
            const nextRetryDateTime = new Date(now.getTime() + nextOffsetTime);
            this.storage.nextPinCodeEnableTime = nextRetryDateTime;
          }

          this.numPad.clearPinCode();
          this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.areEqual'));
        }

        this.checkPinCodeOverFailedState();
      }
    }
  }

  clearNextPinCodeEnableRemainTimeCalculator() {
    if (this.nextPinCodeEnableRemainTimeCalculator !== null) {
      clearInterval(this.nextPinCodeEnableRemainTimeCalculator);
      this.nextPinCodeEnableRemainTimeCalculator = null;
    }
  }

  checkPinCodeOverFailedState() {
    if (this.isPinCodeOverFailed()) {
      this.clearNextPinCodeEnableRemainTimeCalculator();
      this.calculateNextPinCodeEnableRemainTime();
      setInterval(() => {
        this.calculateNextPinCodeEnableRemainTime();
      }, 100);
    }
  }

  getRetryStateComment() {
    const textFormat = this.translate.instant('VerificationFailedFormat');
    return String.Format(textFormat, this.remainRetryCount());
  }

  remainRetryCount(): number {
    const result = this.env.config.pinCode.maxPinCodeRetryCount - this.storage.pinCodeFailedCount;
    if (result <= 0) {
      return 1;
    }
    return result;
  }

  isRetryState(): boolean {
    if (this.storage.pinCodeFailedCount > 0 && this.storage.pinCodeFailedCount < this.env.config.pinCode.maxPinCodeRetryCount) {
      return true;
    }

    if (this.isPinCodeOverFailed() && !this.isPinCodeLocked()) {
      return true;
    }

    return false;
  }

  isPinCodeOverFailed(): boolean {
    if (this.storage.pinCodeFailedCount >= this.env.config.pinCode.maxPinCodeRetryCount) {
      return true;
    }
    return false;
  }

  getLockedComment() {
    const textFormat = this.translate.instant('RemainTimeFormat');
    return String.Format(textFormat, this.nextPinCodeEnableRemainTimeDisplay);
  }

  isPinCodeLocked(): boolean {
    if (this.isPinCodeOverFailed()) {
      const nextAvailableTime: Date = this.storage.nextPinCodeEnableTime;
      if (!nextAvailableTime) {
        return false;
      }

      if (new Date().getTime() < nextAvailableTime.getTime()) {
        return true;
      }
    }

    return false;
  }

  calculateNextPinCodeEnableRemainTime() {
    try {
      const nextAvailableTime: Date = this.storage.nextPinCodeEnableTime;
      if (nextAvailableTime) {
        this.nextPinCodeEnableRemainTime = nextAvailableTime.getTime() - new Date().getTime();
      } else {
        this.nextPinCodeEnableRemainTime = 0;
      }

      const remainSecs = String.Format('{0}', this.nextPinCodeEnableRemainTime / 1000);
      this.nextPinCodeEnableRemainTimeDisplay = String.Format('{0}', parseInt(remainSecs, 10));
    } catch (error) {
      this.logger.debug(error);
    }
  }

  onAuthWithPinCodeClick() {
    this.setFingerPrintMode(false);
  }

  onAuthWithFingerPrintClick() {
    if (this.isFingerPrintEnabled) {
      this.setFingerPrintMode(true);
    }
  }

  openFingerPrintAuth() {
    this.faio.show(Consts.FINGER_PRINT_OPTIONS).then(
      result => {
        //android's result is like this but it's not an from Android offical API. it's just plugin's features.
        //{ "withFingerprint": "QtdRCqUmh3sm9jFVfiiZeg==\n" }
        //ios does not have any result

        this.logger.debug('fingerprint success');
        this.performAuthSuccess();
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  setFingerPrintMode(val: boolean) {
    this.isFingerPrintMode = val;
    if (this.isFingerPrintMode) {
      this.openFingerPrintAuth();
    }
  }
}
