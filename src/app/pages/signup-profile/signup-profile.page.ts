import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../providers/router.service';

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

@Component({
  selector: 'app-signup-profile',
  templateUrl: './signup-profile.page.html',
  styleUrls: ['./signup-profile.page.scss']
})
export class SignupProfilePage implements OnInit {
  profileForm: FormGroup;
  profileFormData: {
    displayName: { value: string };
    phoneNumber: { value: string };
  };

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
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
  }

  ionViewWillEnter() {
    this.resetFormData();
  }

  ionViewDidLeave() {
    this.resetFormData();
  }

  resetFormData() {
    this.profileFormData = {
      displayName: { value: '' },
      phoneNumber: { value: '' }
    };

    Object.keys(this.profileForm.controls).forEach(field => {
      // {1}
      const control = this.profileForm.get(field); // {2}
      control.markAsUntouched({ onlySelf: true }); // {3}
    });
  }

  onContinueBtnClick(termsAndConditionsChecked, privacyChecked) {
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

    userInfo.display_name = this.profileFormData.displayName.value;
    userInfo.phone_number = this.profileFormData.phoneNumber.value;

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
}
