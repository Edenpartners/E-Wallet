import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwTxListPage } from './ew-tx-list.page';
import { EwSummaryModule } from '../ew-summary/ew-summary';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

const routes: Routes = [
  {
    path: ':id',
    component: EwTxListPage
  }
];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    EwSummaryModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    })
  ],
  exports: [],

  declarations: [EwTxListPage]
})
export class EwTxListPageModule {}
