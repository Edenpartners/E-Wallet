import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { AddEdnEthPage } from './add-edn-eth.page';

const routes: Routes = [
  {
    path: '',
    component: AddEdnEthPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [AddEdnEthPage]
})
export class AddEdnEthPageModule {}
