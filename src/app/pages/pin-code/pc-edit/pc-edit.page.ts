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

@Component({
  selector: 'app-pc-edit',
  templateUrl: './pc-edit.page.html',
  styleUrls: ['./pc-edit.page.scss']
})
export class PcEditPage implements OnInit {
  userInput = '';

  constructor(
    private rs: RouterService,
    private storage: AppStorageService,
    private logger: NGXLogger,
    private ednApi: EdnRemoteApiService
  ) {}

  ngOnInit() {}

  inputPin(code) {
    if (this.userInput.length >= 6) {
      return;
    }

    this.userInput += String(code);
  }

  delPin() {
    if (this.userInput.length > 0) {
      this.userInput = this.userInput.substring(0, this.userInput.length - 1);
    }
  }
  onCreatePinBtnClick() {
    if (!this.userInput || this.userInput.length !== 6) {
      return;
    }

    this.storage.tempPinNumber = this.userInput;
    this.rs.navigateByUrl('/pc-confirm');
  }
}
