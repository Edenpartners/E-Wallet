import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwTxListPage } from './ew-tx-list.page';

const routes: Routes = [{
  path: '',
  component: EwTxListPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [EwTxListPage]
})
export class EwTxListPageModule {}