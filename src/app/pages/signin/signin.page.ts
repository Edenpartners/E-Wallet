import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IonHeader, Platform, IonInput } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';

import { RouterService } from '../../providers/router.service';
import { env } from '../../../environments/environment';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { emailPattern } from '../../utils/regex-validations';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss']
})
export class SigninPage implements OnInit {
  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private appVersion: AppVersion,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  signinForm: FormGroup;
  signinFormData: {
    email: { value: string };
    password: { value: string };
  };

  ngOnInit() {
    this.resetFormData();
    this.signinForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.pattern(emailPattern)
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(1)
      ])
    });
  }

  ionViewWillEnter() {
    this.resetFormData();
  }

  ionViewDidLeave() {
    this.resetFormData();
  }

  resetFormData() {
    this.signinFormData = {
      email: { value: '' },
      password: { value: '' }
    };
  }

  async signin() {
    Object.keys(this.signinForm.controls).forEach(field => {
      // {1}
      const control = this.signinForm.get(field); // {2}
      control.markAsTouched({ onlySelf: true }); // {3}
    });

    this.signinForm.updateValueAndValidity();
    if (this.signinForm.invalid) {
      return;
    }

    this.feedbackUI.showLoading();

    try {
      const userResult = await this.ednApi.signinFirebaseUser(
        this.signinFormData.email.value,
        this.signinFormData.password.value
      );
      await this.runEdnSignup();
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
    } finally {
      this.feedbackUI.hideLoading();
    }
  }

  async signinWithFacebook() {
    this.feedbackUI.showLoading();
    try {
      const userResult = await this.ednApi.signinFirebaseUserWithFacebook();
      await this.runEdnSignup();
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
    } finally {
      this.feedbackUI.hideLoading();
    }
  }

  async signinWithTwitter() {
    this.feedbackUI.showLoading();
    try {
      const userResult = await this.ednApi.signinFirebaseUserWithTwitter();
      await this.runEdnSignup();
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
    } finally {
      this.feedbackUI.hideLoading();
    }
  }

  async signinWithGoogle() {
    this.feedbackUI.showLoading();

    try {
      const userResult = await this.ednApi.signinFirebaseUserWithGoogle();
      await this.runEdnSignup();
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
    } finally {
      this.feedbackUI.hideLoading();
    }
  }

  runEdnSignup() {
    return new Promise<any>((finalResolve, finalReject) => {
      this.ednApi.signup().then(
        userInfoResult => {
          if (userInfoResult.data) {
            this.storage.userInfo = userInfoResult.data;
            finalResolve();
          } else {
            finalReject(new Error());
          }
        },
        ednError => {
          finalReject(ednError);
        }
      );
    });
  }

  runEdnSignin() {
    let signinPromise;
    if (env.config.patches.useSignupForSignin) {
      signinPromise = this.ednApi.signup();
    } else {
      signinPromise = this.ednApi.signin();
    }
    return new Promise<any>((finalResolve, finalReject) => {
      signinPromise.then(
        ednResult => {
          this.logger.debug('edn signin success !');

          this.ednApi.getUserInfo().then(
            userInfoResult => {
              if (userInfoResult.data) {
                this.storage.userInfo = userInfoResult.data;
                finalResolve();
              } else {
                finalReject(new Error());
              }
            },
            userInfoError => {
              this.logger.debug(userInfoError);
              this.logger.debug('userInfoError !');
              finalReject(userInfoError);
            }
          );
        },
        ednError => {
          finalReject(ednError);
          this.logger.debug(ednError);
          this.logger.debug('edn signin failed !');
        }
      );
    });
  }
}
