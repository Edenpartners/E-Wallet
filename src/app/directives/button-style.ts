import { Directive, ElementRef, Input, OnInit } from '@angular/core';

/* 
Ionic does not currently appear to provide an API to set the navbar background
to an arbitrary color. This directive enables this functionality.
*/

@Directive({
  selector: '[btnStyle]'
})
export class ButtonStyleDirective implements OnInit {
  @Input('btnStyle') styleVal;

  constructor(private element: ElementRef) {}

  ngOnInit() {
    this.applyStyle();
  }

  ngOnChanges() {
    this.applyStyle();
  }

  applyStyle() {
    if (!this.styleVal || this.styleVal === 'default') {
      this.element.nativeElement.setAttribute('fill', 'clear');
      this.element.nativeElement.setAttribute('color', 'info-dark');
    } else if (this.styleVal === 'no') {
      this.element.nativeElement.setAttribute('fill', 'outline');
      this.element.nativeElement.setAttribute('color', 'info-dark');
    }
  }
}