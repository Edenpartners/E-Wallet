import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { PcEditPage } from './pc-edit.page';

const routes: Routes = [{
  path: '',
  component: PcEditPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PcEditPage]
})
export class PcEditPageModule {}