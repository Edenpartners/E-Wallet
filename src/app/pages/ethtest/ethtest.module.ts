import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';
import { EthtestPage } from './ethtest.page';
import { ClipboardModule } from 'ngx-clipboard';

const routes: Routes = [
  {
    path: '',
    component: EthtestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ClipboardModule
  ],
  declarations: [EthtestPage]
})
export class EthtestPageModule {}
