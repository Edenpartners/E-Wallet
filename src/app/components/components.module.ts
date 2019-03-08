import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { CommonNavBarModule, CommonNavBar } from './common-nav-bar';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

import { UserStateChecker } from './user-state-checker';
import { Bip39Handler } from './testers/bip39-handler';
import { EthProviderMaker } from './testers/eth-provider-maker';
import { EthWalletManager } from './testers/eth-wallet-manager';
import { NumPad } from './numpad/num-pad';

@NgModule({
  imports: [IonicModule, TranslateModule, FormsModule, CommonModule, CommonNavBarModule],
  declarations: [UserStateChecker, Bip39Handler, EthProviderMaker, EthWalletManager, NumPad],
  exports: [UserStateChecker, Bip39Handler, EthProviderMaker, EthWalletManager, NumPad, CommonNavBar],
  providers: []
})
export class ComponentsModule {}
