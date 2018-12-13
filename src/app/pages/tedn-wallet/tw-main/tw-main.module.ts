import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { TwMainPage } from './tw-main.page';
import { TwTxListPage } from '../tw-tx-list/tw-tx-list.page';
import { TwTradePage } from '../tw-trade/tw-trade.page';

import { TwTxListPageModule } from '../tw-tx-list/tw-tx-list.module';
import { TwTradePageModule } from '../tw-trade/tw-trade.module';

const routes: Routes = [
  {
    path: 'sub',
    component: TwMainPage
  },
  {
    path: 'sub/:id',
    component: TwMainPage,
    children: [
      {
        path: 'list',
        outlet: 'sub',
        component: TwTxListPage
      },
      {
        path: 'trade',
        outlet: 'sub',
        component: TwTradePage
      }
    ]
  }
];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    TwTxListPageModule,
    TwTradePageModule
  ],
  declarations: [TwMainPage]
})
export class TwMainPageModule {}
