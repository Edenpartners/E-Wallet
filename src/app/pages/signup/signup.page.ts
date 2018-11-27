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

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements OnInit {
  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService
  ) {}

  ngOnInit() {}

  signup(userEmail, password, passwordConfirm) {
    if (!userEmail || !password || !passwordConfirm) {
      alert('invalidated!');
      return;
    }

    this.ednApi.registerFirebaseUser(userEmail, password).then(
      success => {
        this.runEdnSignup();
      },
      error => {
        alert(error);
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
        alert(ednError);
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
        alert(error);
      }
    );
  }

  signinWithTwitter() {
    this.ednApi.signinFirebaseUserWithTwitter().then(
      result => {
        this.runEdnSignup();
      },
      error => {
        alert(error);
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
        alert(error);
      }
    );
  }
}
