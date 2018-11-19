import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../modules/shared.page.module';

import { HomePage } from './home.page';
import { DirectivesModule } from '../../directives/directives.module';

const routes: Routes = [{
  path: '',
  component: HomePage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes),
    DirectivesModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}