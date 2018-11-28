import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval } from 'rxjs';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../../providers/kybernetwork.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { env } from '../../../../environments/environment';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';

@Component({
  selector: 'app-backup-wallet',
  templateUrl: './backup-wallet.page.html',
  styleUrls: ['./backup-wallet.page.scss']
})
export class BackupWalletPage implements OnInit {
  currentWallet: WalletTypes.WalletInfo = null;
  mnemonic = '';
  step = 0;

  correctWords: Array<string> = [];
  userInputWords: Array<any> = [];
  userSelectedWords: Array<any> = [];

  constructor(
    private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private storage: AppStorageService,
    private ednApi: EdnRemoteApiService
  ) {}

  ngOnInit() {
    this.logger.debug('create temp wallet');
    const mWords = ethers.Wallet.createRandom().mnemonic;

    const path = this.etherData.getBIP39DerivationPath(String(0));
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    this.currentWallet = {
      id: UUID.UUID(),
      address: wallet.address,
      info: {
        mnemonic: mWords,
        path: path,
        privateKey: wallet.privateKey
      },
      contracts: [],
      provider: {
        type: EthProviders.Type.KnownNetwork,
        connectionInfo: env.config.ednEthNetwork
      }
    };

    this.mnemonic = mWords;
    this.correctWords = mWords.split(' ');
    let inputWords = mWords.split(' ');
    inputWords = this.shuffle(inputWords);
    inputWords.forEach((item, index) => {
      this.userInputWords.push({ id: index, value: item, selected: false });
    });
    this.userSelectedWords = [];
  }

  onUserSelectWord(wordInfo) {
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
    this.step = 1;
  }

  onVerifyBtnClick() {
    if (this.userSelectedWords.length < 1) {
      return;
    }
    if (this.userSelectedWords.length !== this.correctWords.length) {
      return;
    }

    for (let i = 0; i < this.userSelectedWords.length; i++) {
      const item = this.userSelectedWords[i];
      if (!item.selected) {
        alert('invalid!');
        return;
      }

      if (item.value !== this.correctWords[i]) {
        alert('invalid!');
        return;
      }
    }

    if (this.storage.findWalletByInfo(this.currentWallet)) {
      alert('the wallet already using!');
      return;
    }

    this.ednApi.addEthAddress(this.currentWallet.address).then(
      result => {
        this.storage.addWallet(this.currentWallet);
        alert('wallet added!');
        this.rs.goTo('/home');
      },
      error => {
        alert(error);
      }
    );
  }
}
