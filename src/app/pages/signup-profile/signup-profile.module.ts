import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';

import { SignupProfilePage } from './signup-profile.page';

const routes: Routes = [{
  path: '',
  component: SignupProfilePage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [SignupProfilePage]
})
export class SignupProfilePageModule {}