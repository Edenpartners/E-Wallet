import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { env } from '../../../../environments/environment';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory2 = 'backup wallet2';
const AnalyticsCategory3 = 'backup wallet3';

@Component({
  selector: 'app-backup-wallet',
  templateUrl: './backup-wallet.page.html',
  styleUrls: ['./backup-wallet.page.scss']
})
export class BackupWalletPage implements OnInit {
  mnemonic = '';
  step = 0;

  correctWords: Array<string> = [];
  userInputWords: Array<any> = [];
  userSelectedWords: Array<any> = [];

  constructor(
    private analytics: AnalyticsService,
    private rs: RouterService,
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private storage: AppStorageService,
    private ednApi: EdnRemoteApiService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    this.logger.debug('create temp wallet');
    this.feedbackUI.showLoading();
    setTimeout(() => {
      this.createRandomWallet()
        .then(() => {}, err => {})
        .finally(() => {
          this.feedbackUI.hideLoading();
        });
    }, 500);
  }

  createRandomWallet() {
    return new Promise<any>((finalResolve, finalReject) => {
      this.logger.debug('create temp wallet');
      this.userInputWords = [];
      const mWords = ethers.Wallet.createRandom().mnemonic;

      this.mnemonic = mWords;
      this.correctWords = mWords.split(' ');
      let inputWords = mWords.split(' ');
      inputWords = this.shuffle(inputWords);
      inputWords.forEach((item, index) => {
        this.userInputWords.push({ id: index, value: item, selected: false });
      });
      this.userSelectedWords = [];

      finalResolve();
    });
  }

  onUserSelectWord(wordInfo) {
    this.analytics.logEvent({
      category: AnalyticsCategory3,
      params: {
        action: 'recovery phrase click',
        event_label: 'recovery phrase_recovery phrase click'
      }
    });

    if (wordInfo.selected) {
      wordInfo.selected = false;
      for (let i = 0; i < this.userSelectedWords.length; i++) {
        const item = this.userSelectedWords[i];
        if (item.id === wordInfo.id) {
          this.userSelectedWords.splice(i, 1);
        }
      }
    } else {
      wordInfo.selected = true;
      let found = false;
      for (let i = 0; i < this.userSelectedWords.length; i++) {
        const item = this.userSelectedWords[i];
        if (item.id === wordInfo.id) {
          found = true;
          break;
        }
      }

      if (!found) {
        this.userSelectedWords.push(wordInfo);
      }
    }
  }

  shuffle(array) {
    let currentIndex = array.length,
      temporaryValue,
      randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  onGotItBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory2,
      params: {
        action: 'got it click',
        event_label: 'got it_got it click'
      }
    });

    this.step = 1;
  }

  onVerifyBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory3,
      params: {
        action: 'verify click',
        event_label: 'verify_verify click'
      }
    });

    if (this.userSelectedWords.length < 1) {
      return;
    }
    if (this.userSelectedWords.length !== this.correctWords.length) {
      return;
    }

    for (let i = 0; i < this.userSelectedWords.length; i++) {
      const item = this.userSelectedWords[i];
      if (!item.selected) {
        this.feedbackUI.showErrorDialog('invalid!');
        return;
      }

      if (item.value !== this.correctWords[i]) {
        this.feedbackUI.showErrorDialog('invalid!');
        return;
      }
    }

    if (env.config.pinCode.useDecryptPinCodeByPinCode) {
      this.feedbackUI.showErrorDialog(this.translate.instant('valid.pincode.required'));
      return;
    }

    const loading = this.feedbackUI.showRandomKeyLoading();

    setTimeout(() => {
      this.addWallet()
        .then(
          () => {
            this.feedbackUI.showAlertDialog(this.translate.instant('wallet.added'), {
              category: AnalyticsCategory3,
              params: {
                action: 'wallet added click',
                event_label: 'wallet added_wallet added click'
              }
            });

            this.rs.navigateByUrl('/home');
          },
          err => {
            this.feedbackUI.showErrorDialog(err);
          }
        )
        .finally(() => {
          loading.hide();
        });
    }, 500);
  }

  addWallet() {
    return new Promise<any>((finalResolve, finalReject) => {
      const path = this.etherData.getBIP39DerivationPath(String(0));
      const createdWalletInfo: WalletTypes.EthWalletInfo = this.walletService.createEthWalletInfoToStore(
        this.mnemonic,
        path,
        EthProviders.Type.KnownNetwork,
        env.config.ednEthNetwork,
        this.storage.getWalletPassword()
      );

      if (!createdWalletInfo) {
        finalReject(new Error(this.translate.instant('error.unknown')));
        return;
      }

      if (this.storage.findWalletByInfo(createdWalletInfo)) {
        finalReject(new Error(this.translate.instant('valid.wallet.unique')));
        return;
      }

      this.ednApi.addEthAddress(createdWalletInfo.address).then(
        result => {
          this.storage.addEthAddressToUserInfoTemporary(createdWalletInfo.address);
          this.storage.addWallet(createdWalletInfo);
          finalResolve();
        },
        error => {
          finalReject(error);
        }
      );
    });
  }

  onCopyToClipboardClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory2,
      params: {
        action: 'copy clipboard click',
        event_label: 'copy clipboard_copy clipboard click'
      }
    });

    this.cbService.copyText(this.mnemonic);
    this.feedbackUI.showToast(this.translate.instant('TextCopiedIntoClipboard'));
  }
}
