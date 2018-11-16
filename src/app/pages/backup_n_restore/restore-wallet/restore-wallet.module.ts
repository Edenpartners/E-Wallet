import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { RestoreWalletPage } from './restore-wallet.page';

const routes: Routes = [{
  path: '',
  component: RestoreWalletPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [RestoreWalletPage]
})
export class RestoreWalletPageModule {}