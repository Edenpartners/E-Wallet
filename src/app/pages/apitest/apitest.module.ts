import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';
import { ApitestPage } from './apitest.page';

const routes: Routes = [
  {
    path: '',
    component: ApitestPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [ApitestPage]
})
export class ApitestPageModule {}
