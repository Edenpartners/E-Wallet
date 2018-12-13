import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { NGXLogger } from 'ngx-logger';
import { Header, Platform } from '@ionic/angular';

import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { AppVersion } from '@ionic-native/app-version/ngx';

import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-pc-confirm',
  templateUrl: './pc-confirm.page.html',
  styleUrls: ['./pc-confirm.page.scss']
})
export class PcConfirmPage implements OnInit {
  userInput = '';

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  inputPin(code) {
    if (this.userInput.length >= 6) {
      return;
    }

    this.userInput += String(code);
    if (this.userInput.length >= 6) {
      if (this.userInput === this.storage.tempPinNumber) {
        this.storage.pinNumber = this.userInput;
        this.storage.tempPinNumber = null;
        this.storage.notifyToUserStateObservers();
      } else {
        this.feedbackUI.showErrorDialog('invalid input!');
      }
    }
  }

  delPin() {
    if (this.userInput.length > 0) {
      this.userInput = this.userInput.substring(0, this.userInput.length - 1);
    }
  }
}
