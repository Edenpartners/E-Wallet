import { Directive, ElementRef, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { BigNumberHelper } from '../utils/bigNumberHelper';

/**
 * makes only number keyboard, ion-input will work with string value
 */
@Directive({
  selector: '[appWeakNumber]'
})
export class WeakNumberInputDirective implements OnChanges, OnInit {
  ngOnInit() {
    console.log('weak-number');
    console.log(this.targetInput);

    if (this.targetInput) {
      this.targetInput.getInputElement().then((nativeInputElement: HTMLInputElement) => {
        nativeInputElement.setAttribute('type', 'number');
      });
    }
  }

  ngOnChanges(): void {}
  constructor(private targetInput: IonInput) {}
}

@Directive({
  selector: '[appLimitedDecimals]'
})
export class DecimalsCurrenyInputDirective implements OnInit, OnDestroy {
  @Input('appLimitedDecimals') decimals: number;

  private subscription: Subscription;

  ngOnInit() {
    console.log('init decimals currency input', this.targetInput, this.decimals);
    this.subscription = this.targetInput.ionChange.subscribe(() => {
      this.validateValue();
    });
  }

  ngOnDestroy() {
    console.log('destroy decimals currency input', this.targetInput);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  validateValue() {
    this.internalValidateValue(this.targetInput.value);
  }

  internalValidateValue(val) {
    const safeText = BigNumberHelper.safeText(val, this.decimals);
    if (safeText !== val) {
      this.targetInput.value = safeText;
    }
  }

  constructor(private targetInput: IonInput) {}
}
