import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { CommonNavBar } from './common-nav-bar';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

import { UserStateChecker } from './user-state-checker';
import { Bip39Handler } from './testers/bip39-handler';
import { EthProviderMaker } from './testers/eth-provider-maker';
import { EthWalletManager } from './testers/eth-wallet-manager';

@NgModule({
  imports: [IonicModule, TranslateModule, FormsModule, CommonModule],
  declarations: [
    CommonNavBar,
    UserStateChecker,
    Bip39Handler,
    EthProviderMaker,
    EthWalletManager
  ],
  exports: [
    CommonNavBar,
    UserStateChecker,
    Bip39Handler,
    EthProviderMaker,
    EthWalletManager
  ],
  providers: []
})
export class ComponentsModule {}
