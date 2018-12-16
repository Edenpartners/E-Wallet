import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { NGXLogger } from 'ngx-logger';
import { Header, Platform } from '@ionic/angular';

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

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events
  ) {}

  ngOnInit() {
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

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  handleBack() {
    if (this.isModal) {
      this.events.publish(Consts.EVENT_PIN_CODE_RESULT, null);
      this.events.publish(Consts.EVENT_CLOSE_MODAL);
    } else {
      this.rs.goBack();
    }
  }

  onCreatePinBtnClick() {
    if (this.numPad.getUserInputCount() !== 6) {
      return;
    }

    this.numPad.saveCurrentInputAndReset();
    this.isConfirmStep = true;
  }

  onNumChange() {
    //save to localStorage if creation mode
    if (this.isCreation && this.isConfirmStep) {
      if (this.numPad.getUserInputCount() === 6) {
        if (this.numPad.compareWithSavedInput()) {
          this.storage.setPinNumber(this.numPad.getDecryptedUserInput(), '');
          this.numPad.clear();
          this.storage.notifyToUserStateObservers();
        } else {
          this.numPad.clearPinCode();
          this.feedbackUI.showErrorDialog(
            this.translate.instant('valid.pincode.areEqual')
          );
        }
      }
    } else if (this.isConfirmStep) {
      if (this.numPad.getUserInputCount() === 6) {
        const code = this.numPad.getDecryptedUserInput();
        if (this.storage.isValidPinNumber(code)) {
          this.events.publish(
            Consts.EVENT_PIN_CODE_RESULT,
            this.storage.getWalletPassword(code)
          );
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
