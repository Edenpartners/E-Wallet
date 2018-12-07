import { NgModule } from '@angular/core';
import {
  Router,
  Routes,
  ActivatedRoute,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterModule
} from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';
import { Injectable } from '@angular/core';

import { EwMainPage } from './ew-main.page';
import { EwTxListPage } from '../ew-tx-list/ew-tx-list.page';
import { EwTxListPageModule } from '../ew-tx-list/ew-tx-list.module';
import { EwQrcodePage } from '../ew-qrcode/ew-qrcode.page';
import { EwQrcodePageModule } from '../ew-qrcode/ew-qrcode.module';
import { EwSendtoPage } from '../ew-sendto/ew-sendto.page';
import { EwSendtoPageModule } from '../ew-sendto/ew-sendto.module';

const routes: Routes = [
  {
    path: 'sub',
    component: EwMainPage
  },
  {
    path: 'sub/:id',
    component: EwMainPage,
    children: [
      {
        path: 'list',
        outlet: 'sub',
        component: EwTxListPage
      },
      {
        path: 'qrcode',
        outlet: 'sub',
        component: EwQrcodePage
      },
      {
        path: 'send',
        outlet: 'sub',
        component: EwSendtoPage
      }
    ]
  }
];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    EwTxListPageModule,
    EwQrcodePageModule,
    EwSendtoPageModule
  ],
  declarations: [EwMainPage],
  providers: []
})
export class EwMainPageModule {}
