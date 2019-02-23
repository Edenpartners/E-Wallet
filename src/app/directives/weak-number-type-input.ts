import { Directive, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
import { IonInput } from '@ionic/angular';

/**
 * makes only number keyboard, ion-input will work with string value
 */
@Directive({
  selector: '[appWeakNumber]'
})
export class WeakNumberInputDirective implements OnChanges, OnInit {
  @Input('appWeakNumber') targetInput: IonInput;

  ngOnInit() {
    console.log('weak-number');
    console.log(this.el);
    console.log(this.el.nativeElement);
    console.log(this.targetInput);

    if (this.targetInput) {
      this.targetInput.getInputElement().then((nativeInputElement: HTMLInputElement) => {
        nativeInputElement.setAttribute('type', 'number');
      });
    }
  }

  ngOnChanges(): void {}
  constructor(private el: ElementRef) {}
}
