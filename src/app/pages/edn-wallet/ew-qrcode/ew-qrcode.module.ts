import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwQrcodePage } from './ew-qrcode.page';
import { NgxQRCodeModule } from 'ngx-qrcode2';

const routes: Routes = [{
  path: '',
  component: EwQrcodePage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    NgxQRCodeModule
  ],
  declarations: [EwQrcodePage]
})
export class EwQrcodePageModule {}