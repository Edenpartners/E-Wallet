import { NgModule } from '@angular/core';
import { ButtonStyleDirective, ButtonTextHeightDirective } from './button-style';

import { ScrollbarStyleDirective } from './scrollbar-style';
import { ShadowCssDirective } from './shadow-css';
import { WeakNumberInputDirective } from './weak-number-type-input';

@NgModule({
  declarations: [ButtonStyleDirective, ButtonTextHeightDirective, ScrollbarStyleDirective, ShadowCssDirective, WeakNumberInputDirective],
  exports: [ButtonStyleDirective, ButtonTextHeightDirective, ScrollbarStyleDirective, ShadowCssDirective, WeakNumberInputDirective]
})
export class DirectivesModule {}
