import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { BackupWalletPage } from './backup-wallet.page';

const routes: Routes = [
  {
    path: '',
    component: BackupWalletPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [BackupWalletPage]
})
export class BackupWalletPageModule {}
