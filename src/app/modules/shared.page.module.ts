import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

/**
 * can use every page
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ]
})
export class SharedPageModule {}