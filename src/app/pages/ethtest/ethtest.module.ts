import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';
import { EthtestPage } from './ethtest.page';

const routes: Routes = [{
  path: '',
  component: EthtestPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [EthtestPage]
})
export class EthtestPageModule {}
