import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwTxListPage } from './ew-tx-list.page';

const routes: Routes = [
  {
    path: ':id',
    component: EwTxListPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  exports: [],
  declarations: [EwTxListPage]
})
export class EwTxListPageModule {}
