import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

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

import { SubscriptionPack } from '../../utils/listutil';
import { Keyboard } from '@ionic-native/keyboard/ngx';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss']
})
export class SigninPage implements OnInit {
  env: any;
  keyboardVisible = false;

  subscriptionPack: SubscriptionPack = new SubscriptionPack();
  signinForm: FormGroup;

  viewActivated = false;

  constructor(
    public rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private appVersion: AppVersion,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private keyboard: Keyboard,
    private iab: InAppBrowser
  ) {
    this.env = env;
  }

  ngOnInit() {
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

    this.resetFormData();
  }

  ionViewWillEnter() {
    this.viewActivated = true;
    this.resetFormData();

    this.subscriptionPack.addSubscription(() => {
      return this.keyboard.onKeyboardWillShow().subscribe((val: any) => {
        this.keyboardVisible = true;
      });
    });

    this.subscriptionPack.addSubscription(() => {
      return this.keyboard.onKeyboardWillHide().subscribe((val: any) => {
        this.keyboardVisible = false;
      });
    });
  }

  ionViewWillLeave() {
    this.viewActivated = false;
  }
  ionViewDidLeave() {
    this.resetFormData();
    this.subscriptionPack.clear();
  }

  resetFormData() {
    this.signinForm.get('email').setValue('');
    this.signinForm.get('password').setValue('');

    Object.keys(this.signinForm.controls).forEach(field => {
      // {1}
      const control = this.signinForm.get(field); // {2}
      control.markAsUntouched({ onlySelf: true }); // {3}
    });
  }

  onForgotPasswdClick() {
    const link = 'https://e-garden.edenchain.io/en/account/password/reset/';
    const browser = this.iab.create(link, '_system');
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
        this.signinForm.get('email').value,
        this.signinForm.get('password').value
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
