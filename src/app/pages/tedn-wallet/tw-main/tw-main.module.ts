import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { TwMainPage } from './tw-main.page';

const routes: Routes = [{
  path: '',
  component: TwMainPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [TwMainPage]
})
export class TwMainPageModule {}