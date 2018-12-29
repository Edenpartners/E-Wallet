import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { PrivacyPolicyPage } from './privacy-policy.page';

const routes: Routes = [
  {
    path: '',
    component: PrivacyPolicyPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [PrivacyPolicyPage]
})
export class PrivacyPolicyPageModule {}
