import { NgModule } from '@angular/core';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { CommonNavBar } from './common-nav-bar';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

@NgModule({
  imports: [IonicModule, TranslateModule],
  declarations: [CommonNavBar],
  exports: [CommonNavBar],
  providers: []
})
export class ComponentsModule {}