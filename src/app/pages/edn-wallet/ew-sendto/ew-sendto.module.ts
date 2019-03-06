import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwSendtoPage } from './ew-sendto.page';
import { EwSummaryModule } from '../ew-summary/ew-summary';

const routes: Routes = [
  {
    path: ':id',
    component: EwSendtoPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes), EwSummaryModule],
  declarations: [EwSendtoPage]
})
export class EwSendtoPageModule {}
