import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { DpEdnMainPage } from './dp-edn-main.page';

const routes: Routes = [{
  path: '',
  component: DpEdnMainPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [DpEdnMainPage]
})
export class DpEdnMainPageModule {}