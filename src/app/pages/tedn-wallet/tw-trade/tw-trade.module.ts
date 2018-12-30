import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { TwTradePage } from './tw-trade.page';

const routes: Routes = [
  {
    path: ':id',
    component: TwTradePage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [TwTradePage]
})
export class TwTradePageModule {}
