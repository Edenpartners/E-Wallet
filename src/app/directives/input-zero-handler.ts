import { Directive, ElementRef, Input, OnChanges, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TextUtils } from '../utils/textutils';
import { IonInput } from '@ionic/angular';
import { Subscription } from 'rxjs';

/**
 * https://nitayneeman.com/posts/listening-to-dom-changes-using-mutationobserver-in-angular/
 */
@Directive({
  selector: '[appZeroHandler]'
})
export class InputZeroHandlerDirective implements OnInit, OnDestroy {
  private focusSubscription: Subscription = null;
  private blurSubscription: Subscription = null;
  constructor(private target: IonInput) {}

  ngOnInit() {
    this.blurSubscription = this.target.ionBlur.subscribe(() => {
      if (this.target.value && this.target.value.trim() === '') {
        this.target.value = '0';
      }
    });

    this.focusSubscription = this.target.ionFocus.subscribe(() => {
      if (this.target.value && this.target.value.trim() === '0') {
        this.target.value = '';
      }
    });
  }
  ngOnDestroy() {
    if (this.focusSubscription) {
      this.focusSubscription.unsubscribe();
      this.focusSubscription = null;
    }
    if (this.blurSubscription) {
      this.blurSubscription.unsubscribe();
      this.blurSubscription = null;
    }
  }
}
