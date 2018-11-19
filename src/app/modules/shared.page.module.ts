import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '../directives/directives.module';

/**
 * can use every page
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DirectivesModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  declarations: []
})
export class SharedPageModule {}