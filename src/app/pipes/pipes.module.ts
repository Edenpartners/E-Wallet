import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { SafeHtmlPipe } from './safeHtml';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

@NgModule({
  imports: [IonicModule],
  declarations: [SafeHtmlPipe],
  exports: [SafeHtmlPipe]
})
export class PipesModule {}
