import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '../directives/directives.module';
import { ComponentsModule } from '../components/components.module';

/**
 * can use every page
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DirectivesModule,
    ComponentsModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    DirectivesModule,
    ComponentsModule
  ],
  declarations: []
})
export class SharedPageModule {}
