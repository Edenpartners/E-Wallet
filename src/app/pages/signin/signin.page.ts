import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Header, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../providers/wallet.service';

import { RouterService } from '../../providers/router.service';
import { env } from '../../../environments/environment';

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
    private appVersion: AppVersion
  ) {}

  ngOnInit() {}

  signin(userEmail, password) {
    if (!userEmail || !password) {
      alert('invalidated!');
      return;
    }

    this.ednApi.signinFirebaseUser(userEmail, password).then(
      result => {
        this.runEdnSignup();
      },
      error => {
        alert(error);
      }
    );
  }
  signinWithFacebook() {
    this.ednApi.signinFirebaseUserWithFacebook().then(
      result => {
        this.logger.debug(result);
        this.runEdnSignup();
      },
      error => {}
    );
  }

  signinWithTwitter() {
    this.ednApi.signinFirebaseUserWithTwitter().then(
      result => {
        this.runEdnSignup();
      },
      error => {}
    );
  }

  signinWithGoogle() {
    this.ednApi.signinFirebaseUserWithGoogle().then(
      result => {
        this.logger.debug(result);
        this.runEdnSignup();
      },
      error => {}
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
        alert(ednError);
      }
    );
  }

  runEdnSignin() {
    let signinPromise;
    if (env.config.patches.useSignupForSignin) {
      signinPromise = this.ednApi.signup();
    } else {
      signinPromise = this.ednApi.signin();
    }
    signinPromise.then(
      ednResult => {
        this.logger.debug('edn signin success !');

        this.ednApi.getUserInfo().then(
          userInfoResult => {
            if (userInfoResult.data) {
              this.storage.userInfo = userInfoResult.data;
            }
          },
          userInfoError => {
            this.logger.debug(userInfoError);
            this.logger.debug('userInfoError !');
          }
        );
      },
      ednError => {
        this.logger.debug(ednError);
        this.logger.debug('edn signin failed !');
      }
    );
  }
}
