import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { RouterService } from '../../providers/router.service';
import { IonCheckbox } from '@ionic/angular';
import { NGXLogger } from 'ngx-logger';
import { IonHeader, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import {
  emailPattern,
  phoneNumberPattern
} from '../../utils/regex-validations';

import { Events } from '@ionic/angular';
import { Consts } from 'src/environments/constants';

import {
  EVENT_PRIVACY_POLICY_RESULT,
  PrivacyPolicyPage
} from './privacy-policy/privacy-policy.page';

import {
  EVENT_TERMS_AND_CONDITION_RESULT,
  TermsAndConditionPage
} from './terms-and-condition/terms-and-condition.page';

@Component({
  selector: 'app-signup-profile',
  templateUrl: './signup-profile.page.html',
  styleUrls: ['./signup-profile.page.scss']
})
export class SignupProfilePage implements OnInit, OnDestroy {
  profileForm: FormGroup;

  @ViewChild('termsAndConditionsCheckBox')
  termsAndConditionsCheckBox: IonCheckbox;
  @ViewChild('privacyCheckBox') privacyCheckBox: IonCheckbox;

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events
  ) {}

  ngOnInit() {
    this.profileForm = new FormGroup({
      displayName: new FormControl('', [Validators.required]),
      phoneNumber: new FormControl('', [
        Validators.required,
        Validators.pattern(phoneNumberPattern)
      ])
    });
    this.resetFormData();

    this.events.subscribe(EVENT_PRIVACY_POLICY_RESULT, result => {
      this.privacyCheckBox.checked = result;
    });

    this.events.subscribe(EVENT_TERMS_AND_CONDITION_RESULT, result => {
      this.termsAndConditionsCheckBox.checked = result;
    });
  }

  ngOnDestroy() {
    this.events.unsubscribe(EVENT_PRIVACY_POLICY_RESULT);
    this.events.unsubscribe(EVENT_TERMS_AND_CONDITION_RESULT);
  }

  ionViewWillEnter() {
    this.termsAndConditionsCheckBox.checked = false;
    this.privacyCheckBox.checked = false;

    this.logger.debug('ion view will enter');
    this.resetFormData();
  }

  ionViewDidLeave() {
    this.resetFormData();
  }

  resetFormData() {
    this.profileForm.get('displayName').setValue('');
    this.profileForm.get('phoneNumber').setValue('');

    Object.keys(this.profileForm.controls).forEach(field => {
      // {1}
      const control = this.profileForm.get(field); // {2}
      control.markAsUntouched({ onlySelf: true }); // {3}
    });
  }

  onContinueBtnClick() {
    Object.keys(this.profileForm.controls).forEach(field => {
      // {1}
      const control = this.profileForm.get(field); // {2}
      control.markAsTouched({ onlySelf: true }); // {3}
    });

    this.profileForm.updateValueAndValidity();
    if (this.profileForm.invalid) {
      this.logger.debug('invalidated');
      return;
    }

    const termsAndConditionsChecked = this.termsAndConditionsCheckBox.checked;
    const privacyChecked = this.privacyCheckBox.checked;

    if (!termsAndConditionsChecked) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.terms.pattern')
      );
      return;
    }
    if (!privacyChecked) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.privacy.pattern')
      );
      return;
    }

    const userInfo = this.storage.userInfo;
    const additionalInfo = this.storage.additionalInfo;

    userInfo.display_name = this.profileForm.get('displayName').value;
    userInfo.phone_number = this.profileForm.get('phoneNumber').value;

    additionalInfo.termsAndConditionsAllowed = termsAndConditionsChecked;
    additionalInfo.privacyAllowed = privacyChecked;

    this.feedbackUI.showLoading();
    this.ednApi
      .updateUserInfo(userInfo)
      .then(
        result => {
          this.ednApi.getUserInfo().then(
            userInfoResult => {
              if (userInfoResult.data) {
                this.storage.userInfo = userInfoResult.data;
                this.storage.additionalInfo = additionalInfo;
                this.storage.notifyToUserStateObservers();
              }
            },
            userInfoError => {
              this.feedbackUI.showErrorDialog(userInfoError);
            }
          );
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        this.feedbackUI.hideLoading();
      });
  }

  openTermsAndConditions() {
    this.events.publish(Consts.EVENT_SHOW_MODAL, TermsAndConditionPage);
  }
  openPrivacyPolicy() {
    this.events.publish(Consts.EVENT_SHOW_MODAL, PrivacyPolicyPage);
  }
}
