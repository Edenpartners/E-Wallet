import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';

import { SigninPage } from './signin.page';

const routes: Routes = [{
  path: '',
  component: SigninPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [SigninPage]
})
export class SigninPageModule {}