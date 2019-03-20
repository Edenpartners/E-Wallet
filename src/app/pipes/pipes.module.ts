import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { SafeHtmlPipe } from './safeHtml';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { CommaPipe } from './comma';

@NgModule({
  imports: [IonicModule],
  declarations: [SafeHtmlPipe, CommaPipe],
  exports: [SafeHtmlPipe, CommaPipe]
})
export class PipesModule {}
