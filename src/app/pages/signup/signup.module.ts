import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';

import { SignupPage } from './signup.page';

const routes: Routes = [{
  path: '',
  component: SignupPage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
  ],
  declarations: [SignupPage]
})
export class SignupPageModule {}