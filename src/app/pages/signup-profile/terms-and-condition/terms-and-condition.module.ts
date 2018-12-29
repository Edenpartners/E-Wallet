import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { TermsAndConditionPage } from './terms-and-condition.page';

const routes: Routes = [
  {
    path: '',
    component: TermsAndConditionPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [TermsAndConditionPage]
})
export class TermsAndConditionPageModule {}
