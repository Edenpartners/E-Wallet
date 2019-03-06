import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';
import { ContentPopupPage } from './content-popup.page';

const routes: Routes = [
  {
    path: '',
    component: ContentPopupPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [ContentPopupPage]
})
export class ContentPopupPageModule {}
