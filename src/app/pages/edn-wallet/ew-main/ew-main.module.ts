import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { EwMainPage } from './ew-main.page';

const routes: Routes = [{
  path: '',
  component: EwMainPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [EwMainPage]
})
export class EwMainPageModule {}