import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { TwTxListPage } from './tw-tx-list.page';

const routes: Routes = [
  {
    path: ':id',
    component: TwTxListPage
  }
];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    })
  ],
  declarations: [TwTxListPage]
})
export class TwTxListPageModule {}
