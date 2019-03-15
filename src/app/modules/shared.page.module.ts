import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '../directives/directives.module';
import { ComponentsModule } from '../components/components.module';
import { PipesModule } from '../pipes/pipes.module';

/**
 * can use every page
 */
@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, TranslateModule, DirectivesModule, ComponentsModule, PipesModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, TranslateModule, DirectivesModule, ComponentsModule, PipesModule],
  declarations: []
})
export class SharedPageModule {}
