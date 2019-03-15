import { NgModule } from '@angular/core';
import { ButtonStyleDirective, ButtonTextHeightDirective } from './button-style';

import { ScrollbarStyleDirective } from './scrollbar-style';
import { ShadowCssDirective } from './shadow-css';
import { WeakNumberInputDirective, DecimalsCurrenyInputDirective } from './weak-number-type-input';
import { MultilineLayoutDirective } from './multiline-layout';
import { InputZeroHandlerDirective } from './input-zero-handler';

@NgModule({
  declarations: [
    ButtonStyleDirective,
    ButtonTextHeightDirective,
    ScrollbarStyleDirective,
    ShadowCssDirective,
    WeakNumberInputDirective,
    DecimalsCurrenyInputDirective,
    MultilineLayoutDirective,
    InputZeroHandlerDirective
  ],
  exports: [
    ButtonStyleDirective,
    ButtonTextHeightDirective,
    ScrollbarStyleDirective,
    ShadowCssDirective,
    WeakNumberInputDirective,
    DecimalsCurrenyInputDirective,
    MultilineLayoutDirective,
    InputZeroHandlerDirective
  ]
})
export class DirectivesModule {}
