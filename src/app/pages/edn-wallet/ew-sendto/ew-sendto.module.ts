import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { EwSendtoPage } from './ew-sendto.page';

const routes: Routes = [
  {
    path: '',
    component: EwSendtoPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [EwSendtoPage]
})
export class EwSendtoPageModule {}
