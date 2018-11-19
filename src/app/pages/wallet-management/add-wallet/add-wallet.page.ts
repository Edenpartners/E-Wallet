import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { getJsonWalletAddress, BigNumber, AbiCoder, Transaction } from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval } from 'rxjs';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, ContractInfo, ContractType, WalletInfo } from '../../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../../providers/kybernetwork.service';
import { EtherApiService } from '../../../providers/etherApi.service';

@Component({
  selector: 'app-add-wallet',
  templateUrl: './add-wallet.page.html',
  styleUrls: ['./add-wallet.page.scss'],
})
export class AddWalletPage implements OnInit {

  @LocalStorage() insecureWallets = [];

  constructor(private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService) {}

  ngOnInit() {}

  onCreateBtnClick() {

    const mWords = ethers.Wallet.createRandom().mnemonic;

    const path = this.etherData.getBIP39DerivationPath(String(0));
    const wallet = ethers.Wallet.fromMnemonic(mWords, path);

    const walletInfo: WalletInfo = {
      id: UUID.UUID(),
      address: wallet.address,
      info: {
        mnemonic: mWords,
        path: path,
        privateKey: wallet.privateKey,
      },
      contracts: [],
      provider: { type: EthProviders.Type.KnownNetwork, connectionInfo: 'ropsten' },
    };

    this.insecureWallets.push(walletInfo);

    //this.rs.goBack();

    this.rs.goTo('/backup-notice');
  }
  onImportBtnClick() {
    this.rs.goTo('/restore-wallet');
  }
}