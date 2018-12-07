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
  selector: 'app-restore-wallet',
  templateUrl: './restore-wallet.page.html',
  styleUrls: ['./restore-wallet.page.scss']
})
export class RestoreWalletPage implements OnInit {
  userInputMnemonic = '';

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

  ngOnInit() {}

  restoreWallet() {
    if (this.userInputMnemonic.length < 1) {
      alert('invalid value!');
      return;
    }
    this.logger.debug(this.userInputMnemonic);

    let walletInfo: WalletTypes.EthWalletInfo = null;

    try {
      const mWords = this.userInputMnemonic.trim();
      const path = this.etherData.getBIP39DerivationPath(String(0));
      const wallet = ethers.Wallet.fromMnemonic(mWords, path);

      walletInfo = {
        id: UUID.UUID(),
        address: wallet.address,
        type: WalletTypes.WalletType.Ethereum,
        profile: {
          alias: '',
          color: '',
          order: -1
        },

        info: {
          data: {
            mnemonic: mWords,
            path: path,
            privateKey: wallet.privateKey
          },
          contracts: [],
          provider: {
            type: EthProviders.Type.KnownNetwork,
            connectionInfo: env.config.ednEthNetwork
          }
        }
      };
    } catch (e) {
      this.logger.debug(e);
      alert(e);
    }

    if (!walletInfo) {
      return;
    }

    if (this.storage.findWalletByInfo(walletInfo)) {
      alert('the wallet already using!');
      return;
    }

    this.ednApi.addEthAddress(walletInfo.address).then(
      result => {
        this.storage.addWallet(walletInfo);
        alert('wallet restored');
        this.rs.goTo('/home');
      },
      error => {
        alert(error);
      }
    );
  }
}
