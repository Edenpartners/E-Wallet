import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { RegauthIntroPage } from './regauth-intro.page';

const routes: Routes = [
  {
    path: '',
    component: RegauthIntroPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [RegauthIntroPage]
})
export class RegauthIntroPageModule {}
