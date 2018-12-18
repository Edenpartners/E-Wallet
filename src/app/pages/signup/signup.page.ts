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

import { Validators, FormGroup, FormControl } from '@angular/forms';
import { emailPattern } from '../../utils/regex-validations';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements OnInit {
  signupForm: FormGroup;
  signupFormData = {
    email: { value: '' },
    password: { value: '' },
    passwordConfirm: { value: '' }
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
    this.signupForm = new FormGroup(
      {
        email: new FormControl('', [
          Validators.required,
          Validators.pattern(emailPattern)
        ]),
        password: new FormControl('', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(12)
        ]),
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

    const loading = this.feedbackUI.createLoading();

    this.ednApi
      .registerFirebaseUser(
        this.signupFormData.email.value,
        this.signupFormData.password.value
      )
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
    const loading = this.feedbackUI.createLoading();

    this.logger.debug('run edn signup');
    this.ednApi
      .signup()
      .then(
        userInfoResult => {
          if (userInfoResult.data) {
            this.storage.userInfo = userInfoResult.data;
          }
        },
        ednError => {
          this.feedbackUI.showErrorDialog(ednError);
        }
      )
      .finally(() => {
        loading.hide();
      });
  }

  signinWithFacebook() {
    const loading = this.feedbackUI.createLoading();

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
    const loading = this.feedbackUI.createLoading();
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
    const loading = this.feedbackUI.createLoading();

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
