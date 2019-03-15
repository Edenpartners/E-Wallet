import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IonHeader, Platform, IonInput } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import { AppStorageTypes, AppStorageService } from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';

import { RouterService } from '../../providers/router.service';
import { env } from '../../../environments/environment';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { emailPattern } from '../../utils/regex-validations';

import { SubscriptionPack } from '../../utils/listutil';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { AnalyticsService } from '../../providers/analytics.service';

const AnalyticsCategory = 'Login';

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

  showPassword = false;

  constructor(
    public rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private appVersion: AppVersion,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private keyboard: Keyboard,
    private iab: InAppBrowser,
    private analytics: AnalyticsService
  ) {
    this.env = env;
  }

  ngOnInit() {
    this.signinForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.pattern(emailPattern)]),
      password: new FormControl('', [Validators.required, Validators.minLength(1)])
    });

    this.resetFormData();
  }

  ionViewWillEnter() {
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

  ionViewWillLeave() {}
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

    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'forgot pwd',
        event_label: 'forgot pwd_forgot pwd click'
      }
    });
  }

  async signin() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'signin click',
        event_label: 'signin_signin click'
      }
    });

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
      const userResult = await this.ednApi.signinFirebaseUser(this.signinForm.get('email').value, this.signinForm.get('password').value);
      await this.runEdnSignup();
    } catch (e) {
      this.feedbackUI.showErrorDialog(e);
    } finally {
      this.feedbackUI.hideLoading();
    }
  }

  async signinWithFacebook() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'facebooklogin',
        event_label: 'facebooklogin_facebooklogin click'
      }
    });

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
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'twitterlogin',
        event_label: 'twitterlogin_twitterlogin click'
      }
    });

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
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'googlelogin',
        event_label: 'googlelogin_googlelogin click'
      }
    });

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

  signup() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'signup',
        event_label: 'signup_signup click'
      }
    });

    this.rs.navigateByUrl('/signup');
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
