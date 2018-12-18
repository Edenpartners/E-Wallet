import { NgModule } from '@angular/core';
import {
  ButtonStyleDirective,
  ButtonTextHeightDirective
} from './button-style';

@NgModule({
  declarations: [ButtonStyleDirective, ButtonTextHeightDirective],
  exports: [ButtonStyleDirective, ButtonTextHeightDirective]
})
export class DirectivesModule {}
