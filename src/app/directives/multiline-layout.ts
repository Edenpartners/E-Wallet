import { Directive, ElementRef, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appMultilineLayout]',
  exportAs: 'multilineLayout'
})
export class MultilineLayoutDirective implements OnInit, OnDestroy {
  @Input('appMultilineLayout') minFontSize: string;
  originalFontSize: string;

  ngOnInit() {
    console.log('init multiline layout', this.target, this.minFontSize);
  }

  ngOnDestroy() {
    console.log('destroy multiline layout', this.target);
  }

  constructor(private target: ElementRef) {}

  public updateLayout() {}
}
