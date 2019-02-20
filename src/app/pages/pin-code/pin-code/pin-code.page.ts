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

const AnalyticsCategory = 'confirm pin';

@Component({
  selector: 'app-pin-code',
  templateUrl: './pin-code.page.html',
  styleUrls: ['./pin-code.page.scss']
})
export class PinCodePage implements OnInit, OnDestroy {
  @ViewChild(NumPad) numPad: NumPad;

  isModal = false;
  isCreation = false;
  isConfirmStep = true;
  isComplete = false;

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private analytics: AnalyticsService
  ) {
    this.logger.trace('init pin-code');
  }

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.isModal = false;
    this.isCreation = false;
    this.isConfirmStep = true;
    this.isComplete = false;
    this.numPad.clear();

    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.queryParamMap.subscribe(query => {
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
          }
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ionViewDidLeave() {
    this.subscriptionPack.clear();
    this.numPad.clear();
  }

  handleBack(): boolean {
    if (this.isModal) {
      this.events.publish(Consts.EVENT_PIN_CODE_RESULT, null);
      this.events.publish(Consts.EVENT_CLOSE_MODAL);
      return true;
    } else {
      //restart creation
      if (this.isCreation && this.isConfirmStep) {
        this.isConfirmStep = false;
        this.numPad.clear();
        return true;
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

  onNumChange() {
    //save to localStorage if creation mode
    if (this.isCreation) {
      if (this.isConfirmStep) {
        if (this.numPad.getUserInputCount() === Consts.PIN_CODE_LENGTH) {
          if (this.numPad.compareWithSavedInput()) {
            this.storage.setPinNumber(this.numPad.getDecryptedUserInput(), '');
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
        if (this.storage.isValidPinNumber(code)) {
          this.events.publish(Consts.EVENT_PIN_CODE_RESULT, this.storage.getWalletPassword(code));
          this.isComplete = true;
          this.events.publish(Consts.EVENT_CLOSE_MODAL);
        } else {
          this.numPad.clearPinCode();
          this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.areEqual'));
        }
      }
    }
  }
}
