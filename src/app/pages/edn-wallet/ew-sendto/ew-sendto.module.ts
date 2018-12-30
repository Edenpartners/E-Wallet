import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwSendtoPage } from './ew-sendto.page';

const routes: Routes = [
  {
    path: ':id',
    component: EwSendtoPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [EwSendtoPage]
})
export class EwSendtoPageModule {}
