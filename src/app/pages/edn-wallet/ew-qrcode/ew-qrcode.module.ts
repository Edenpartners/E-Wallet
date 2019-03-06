import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwQrcodePage } from './ew-qrcode.page';
import { QRCodeModule } from 'angularx-qrcode';
import { EwSummaryModule } from '../ew-summary/ew-summary';

const routes: Routes = [
  {
    path: ':id',
    component: EwQrcodePage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes), QRCodeModule, EwSummaryModule],
  declarations: [EwQrcodePage],
  exports: []
})
export class EwQrcodePageModule {}
