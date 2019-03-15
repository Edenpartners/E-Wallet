import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';
import { QrscannerPage } from './qrscanner.page';

const routes: Routes = [
  {
    path: '',
    component: QrscannerPage
  }
];

@NgModule({
  imports: [SharedPageModule, RouterModule.forChild(routes)],
  declarations: [QrscannerPage]
})
export class QrscannerPageModule {}
