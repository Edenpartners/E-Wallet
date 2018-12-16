import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../providers/router.service';

import { NGXLogger } from 'ngx-logger';
import { Header, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-signup-profile',
  templateUrl: './signup-profile.page.html',
  styleUrls: ['./signup-profile.page.scss']
})
export class SignupProfilePage implements OnInit {
  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  onContinueBtnClick(
    displayName,
    mobileNumber,
    termsAndConditionsChecked,
    privacyChecked
  ) {
    if (
      !displayName ||
      !mobileNumber ||
      !termsAndConditionsChecked ||
      !privacyChecked
    ) {
      this.feedbackUI.showErrorDialog('invalidated!');
      return;
    }

    const userInfo = this.storage.userInfo;
    const additionalInfo = this.storage.additionalInfo;

    userInfo.display_name = displayName;
    userInfo.phone_number = mobileNumber;

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
