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

@Component({
  selector: 'app-pc-edit',
  templateUrl: './pc-edit.page.html',
  styleUrls: ['./pc-edit.page.scss']
})
export class PcEditPage implements OnInit, OnDestroy {
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
    private events: Events
  ) {
    this.logger.trace('init pc-edit');
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
          if (
            query.get('isCreation') !== undefined &&
            query.get('isCreation') !== null
          ) {
            const creationVal = query.get('isCreation');
            this.isCreation = creationVal === 'true' ? true : false;
            this.logger.debug('isCreation : ', this.isCreation);
            if (this.isCreation) {
              this.isConfirmStep = false;

              this.logger.debug('add custom back handler');
              this.rs.addCustomBackHandler('pc-edit', () => {
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
    if (this.isCreation && this.isConfirmStep) {
      if (this.numPad.getUserInputCount() === Consts.PIN_CODE_LENGTH) {
        if (this.numPad.compareWithSavedInput()) {
          this.storage.setPinNumber(this.numPad.getDecryptedUserInput(), '');
          this.numPad.clear();
          this.isComplete = true;
          this.storage.notifyToUserStateObservers();
        } else {
          this.numPad.clearPinCode();
          this.feedbackUI.showErrorDialog(
            this.translate.instant('valid.pincode.areEqual')
          );
        }
      }
    } else if (this.isConfirmStep) {
      if (this.numPad.getUserInputCount() === Consts.PIN_CODE_LENGTH) {
        const code = this.numPad.getDecryptedUserInput();
        this.numPad.clearPinCode();
        if (this.storage.isValidPinNumber(code)) {
          this.events.publish(
            Consts.EVENT_PIN_CODE_RESULT,
            this.storage.getWalletPassword(code)
          );
          this.isComplete = true;
          this.events.publish(Consts.EVENT_CLOSE_MODAL);
        } else {
          this.numPad.clearPinCode();
          this.feedbackUI.showErrorDialog(
            this.translate.instant('valid.pincode.areEqual')
          );
        }
      }
    }
  }
}
