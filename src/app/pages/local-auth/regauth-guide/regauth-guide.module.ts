import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { RegauthGuidePage } from './regauth-guide.page';

const routes: Routes = [
  {
    path: '',
    component: RegauthGuidePage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [RegauthGuidePage]
})
export class RegauthGuidePageModule {}
