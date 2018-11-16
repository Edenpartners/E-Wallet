import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { PcConfirmPage } from './pc-confirm.page';

const routes: Routes = [{
  path: '',
  component: PcConfirmPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PcConfirmPage]
})
export class PcConfirmPageModule {}