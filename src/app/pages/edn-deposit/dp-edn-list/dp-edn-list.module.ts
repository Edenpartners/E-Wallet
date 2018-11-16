import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { DpEdnListPage } from './dp-edn-list.page';

const routes: Routes = [{
  path: '',
  component: DpEdnListPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [DpEdnListPage]
})
export class DpEdnListPageModule {}