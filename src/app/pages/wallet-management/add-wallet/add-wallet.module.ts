import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { AddWalletPage } from './add-wallet.page';

const routes: Routes = [{
  path: '',
  component: AddWalletPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [AddWalletPage]
})
export class AddWalletPageModule {}