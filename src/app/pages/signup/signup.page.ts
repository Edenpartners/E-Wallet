import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../providers/router.service';

import { NGXLogger } from 'ngx-logger';
import { IonHeader, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import { AppStorageTypes, AppStorageService } from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Validators, FormGroup, FormControl } from '@angular/forms';
import { emailPattern } from '../../utils/regex-validations';
import { env } from 'src/environments/environment';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements OnInit {
  signupForm: FormGroup;
  env: any;

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {
    this.env = env;
  }

  ngOnInit() {
    this.signupForm = new FormGroup(
      {
        email: new FormControl('', [Validators.required, Validators.pattern(emailPattern)]),
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(12)]),
        passwordConfirm: new FormControl('', [Validators.required])
      },
      {
        validators: [
          (group: FormGroup) => {
            // here we have the 'passwords' group
            const pass = group.controls.password.value;
            const confirmPass = group.controls.passwordConfirm.value;

            //to show required first.
            if (!confirmPass) {
              return null;
            }

            return pass === confirmPass ? null : { areEqual: true };
          }
        ]
      }
    );
    this.resetFormData();
  }

  ionViewWillEnter() {
    this.resetFormData();
  }

  ionViewDidLeave() {
    this.resetFormData();
  }

  resetFormData() {
    this.signupForm.get('email').setValue('');
    this.signupForm.get('password').setValue('');
    this.signupForm.get('passwordConfirm').setValue('');

    Object.keys(this.signupForm.controls).forEach(field => {
      // {1}
      const control = this.signupForm.get(field); // {2}
      control.markAsUntouched({ onlySelf: true }); // {3}
    });
  }

  signup() {
    Object.keys(this.signupForm.controls).forEach(field => {
      // {1}
      const control = this.signupForm.get(field); // {2}
      control.markAsTouched({ onlySelf: true }); // {3}
    });

    this.signupForm.updateValueAndValidity();
    if (this.signupForm.invalid) {
      this.logger.debug('invalidated');
      return;
    }

    const loading = this.feedbackUI.showRandomKeyLoading();

    this.ednApi
      .registerFirebaseUser(this.signupForm.get('email').value, this.signupForm.get('password').value)
      .then(
        success => {
          this.runEdnSignup();
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        loading.hide();
      });
  }

  runEdnSignup() {
    const loading = this.feedbackUI.showRandomKeyLoading();

    let signupPromise;
    if (env.config.patches.useSigninForSignup) {
      signupPromise = this.ednApi.signin();
    } else {
      signupPromise = this.ednApi.signup();
    }

    const onFailed = (error: any) => {
      this.feedbackUI.showErrorAndRetryDialog(
        error,
        () => {
          this.runEdnSignup();
        },
        () => {}
      );
    };
    signupPromise.then(
      ednResult => {
        this.logger.debug('edn signin success !', ednResult);

        if (ednResult.data && ednResult.data.email) {
          this.storage.userInfo = ednResult.data;
          loading.hide();
        } else {
          this.ednApi
            .getUserInfo()
            .then(
              userInfoResult => {
                if (userInfoResult.data) {
                  this.storage.userInfo = userInfoResult.data;
                } else {
                  onFailed(new Error());
                }
              },
              userInfoError => {
                this.logger.debug(userInfoError);
                this.logger.debug('userInfoError !');
                onFailed(userInfoError);
              }
            )
            .finally(() => {
              loading.hide();
            });
        }
      },
      ednError => {
        loading.hide();

        this.logger.debug(ednError);
        this.logger.debug('edn signup failed !');

        onFailed(ednError);
      }
    );

    this.logger.debug('run edn signup');
  }

  signinWithFacebook() {
    const loading = this.feedbackUI.showRandomKeyLoading();

    this.ednApi
      .signinFirebaseUserWithFacebook()
      .then(
        result => {
          this.logger.debug(result);
          this.runEdnSignup();
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        loading.hide();
      });
  }

  signinWithTwitter() {
    const loading = this.feedbackUI.showRandomKeyLoading();
    this.ednApi
      .signinFirebaseUserWithTwitter()
      .then(
        result => {
          this.runEdnSignup();
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        loading.hide();
      });
  }

  signinWithGoogle() {
    const loading = this.feedbackUI.showRandomKeyLoading();

    this.ednApi
      .signinFirebaseUserWithGoogle()
      .then(
        result => {
          this.logger.debug(result);
          this.runEdnSignup();
        },
        error => {
          this.feedbackUI.showErrorDialog(error);
        }
      )
      .finally(() => {
        loading.hide();
      });
  }
}
