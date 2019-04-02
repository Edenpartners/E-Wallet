import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'src/app/providers/clipboard.service';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { env } from '../../../../environments/environment';
import { AppStorageService } from '../../../providers/appStorage.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { IonComponentUtils } from '../../../utils/ion-component-utils';

import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';
import { Wallet } from 'ethers';

const AnalyticsCategory = 'import wallet';
const AnalyticsCategory2 = 'import wallet2';

@Component({
  selector: 'app-restore-wallet',
  templateUrl: './restore-wallet.page.html',
  styleUrls: ['./restore-wallet.page.scss']
})
export class RestoreWalletPage implements OnInit {
  userInputMnemonic = '';
  env: any;

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
  ) {
    this.env = env;
  }

  ngOnInit() {}

  ionViewWillEnter() {}

  ionViewWillLeave() {}

  ionViewDidLeave() {}

  getErrorAnalytics(): AnalyticsEvent {
    return {
      category: AnalyticsCategory2,
      params: {
        action: 'error confirm click',
        event_label: 'error confirm_error confirm click'
      }
    };
  }

  restoreWallet() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'import wallet click',
        event_label: 'import wallet_import wallet click'
      }
    });

    if (this.userInputMnemonic.length < 1) {
      this.feedbackUI.showErrorDialog('invalid value!', this.getErrorAnalytics());
      return;
    }
    this.logger.debug(this.userInputMnemonic);

    const loading = this.feedbackUI.showRandomKeyLoading();

    setTimeout(() => {
      this.addWallet()
        .then(
          () => {
            this.feedbackUI.showAlertDialog('wallet restored', {
              category: AnalyticsCategory2,
              params: {
                action: 'wallet restored confirm click',
                event_label: 'wallet restored_wallet restored confirm click'
              }
            });

            this.rs.navigateByUrl('/home');
          },
          err => {
            if (!err) {
              this.feedbackUI.showErrorDialog(new Error(this.translate.instant('error.unknown')), this.getErrorAnalytics());
            } else {
              this.feedbackUI.showErrorDialog(err, this.getErrorAnalytics());
            }
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
          this.storage.getPinCode()
        );
      } catch (e) {
        this.logger.debug(e);
        finalReject(e);
        return;
      }

      if (!walletInfo) {
        finalReject(new Error('Invalid wallet'));
        return;
      }

      if (this.storage.findWalletByInfo(walletInfo) && this.storage.hasEthAddressInUserInfo(walletInfo.address)) {
        finalReject(new Error(this.translate.instant('valid.wallet.unique')));
        return;
      }

      const pinCode = this.storage.getPinCode();
      const w: Wallet = this.walletService.createEthWalletInstance(walletInfo, pinCode);

      if (!w) {
        finalReject(new Error('invalid wallet'));
        return;
      }

      this.ednApi.addEthAddress(this.ednApi.utils.createEthAddressObject(w)).then(
        result => {
          this.storage.addEthAddressToUserInfoTemporary(walletInfo.address);
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
