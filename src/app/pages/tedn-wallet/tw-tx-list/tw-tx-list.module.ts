import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { TwTxListPage } from './tw-tx-list.page';

const routes: Routes = [
  {
    path: '',
    component: TwTxListPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [TwTxListPage]
})
export class TwTxListPageModule {}
