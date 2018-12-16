import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
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

import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-restore-wallet',
  templateUrl: './restore-wallet.page.html',
  styleUrls: ['./restore-wallet.page.scss']
})
export class RestoreWalletPage implements OnInit {
  userInputMnemonic = '';

  constructor(
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

  restoreWallet() {
    if (this.userInputMnemonic.length < 1) {
      this.feedbackUI.showErrorDialog('invalid value!');
      return;
    }
    this.logger.debug(this.userInputMnemonic);

    if (env.config.useDecryptPinCodeByPinCode) {
      this.feedbackUI.showErrorDialog(
        this.translate.instant('valid.pincode.required')
      );
      return;
    }

    setTimeout(() => {
      const loading = this.feedbackUI.createLoading();
      this.addWallet()
        .then(
          () => {
            this.feedbackUI.showAlertDialog('wallet restored');
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
    return new Promise((finalResolve, finalReject) => {
      let walletInfo: WalletTypes.EthWalletInfo = null;

      try {
        const mWords = this.userInputMnemonic.trim();
        const path = this.etherData.getBIP39DerivationPath(String(0));

        walletInfo = this.walletService.createEthWalletInfoToStore(
          mWords,
          path,
          EthProviders.Type.KnownNetwork,
          env.config.ednEthNetwork,
          this.storage.getWalletPassword()
        );
      } catch (e) {
        this.logger.debug(e);
        finalReject(e);
      }

      if (!walletInfo) {
        return;
      }

      if (this.storage.findWalletByInfo(walletInfo)) {
        finalReject(new Error('the wallet already using!'));
        return;
      }

      this.ednApi.addEthAddress(walletInfo.address).then(
        result => {
          this.storage.addWallet(walletInfo);
          finalResolve();
        },
        error => {
          finalReject(error);
        }
      );
    });
  }
}
