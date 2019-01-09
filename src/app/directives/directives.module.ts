import { NgModule } from '@angular/core';
import {
  ButtonStyleDirective,
  ButtonTextHeightDirective
} from './button-style';

import { ScrollbarStyleDirective } from './scrollbar-style';
import { ShadowCssDirective } from './shadow-css';

@NgModule({
  declarations: [
    ButtonStyleDirective,
    ButtonTextHeightDirective,
    ScrollbarStyleDirective,
    ShadowCssDirective
  ],
  exports: [
    ButtonStyleDirective,
    ButtonTextHeightDirective,
    ScrollbarStyleDirective,
    ShadowCssDirective
  ]
})
export class DirectivesModule {}
