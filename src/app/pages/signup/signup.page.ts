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

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements OnInit {
  signupForm: FormGroup;
  signupFormData = {
    email: { value: '' },
    password: { value: '' }
  };

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  signup(userEmail, password, passwordConfirm) {
    if (!userEmail || !password || !passwordConfirm) {
      this.feedbackUI.showErrorDialog('invalidated!');
      return;
    }

    this.ednApi.registerFirebaseUser(userEmail, password).then(
      success => {
        this.runEdnSignup();
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  runEdnSignup() {
    this.logger.debug('run edn signup');
    this.ednApi.signup().then(
      userInfoResult => {
        if (userInfoResult.data) {
          this.storage.userInfo = userInfoResult.data;
        }
      },
      ednError => {
        this.feedbackUI.showErrorDialog(ednError);
      }
    );
  }

  signinWithFacebook() {
    this.ednApi.signinFirebaseUserWithFacebook().then(
      result => {
        this.logger.debug(result);
        this.runEdnSignup();
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  signinWithTwitter() {
    this.ednApi.signinFirebaseUserWithTwitter().then(
      result => {
        this.runEdnSignup();
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }

  signinWithGoogle() {
    this.ednApi.signinFirebaseUserWithGoogle().then(
      result => {
        this.logger.debug(result);
        this.runEdnSignup();
      },
      error => {
        this.feedbackUI.showErrorDialog(error);
      }
    );
  }
}
