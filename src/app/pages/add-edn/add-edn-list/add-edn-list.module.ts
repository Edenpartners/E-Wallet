import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { AddEdnListPage } from './add-edn-list.page';

const routes: Routes = [
  {
    path: '',
    component: AddEdnListPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [AddEdnListPage]
})
export class AddEdnListPageModule {}
