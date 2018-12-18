import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  AfterViewInit,
  OnChanges
} from '@angular/core';

/*
Ionic does not currently appear to provide an API to set the navbar background
to an arbitrary color. This directive enables this functionality.
*/

@Directive({
  selector: '[appBtnStyle]'
})
export class ButtonStyleDirective implements OnInit, AfterViewInit, OnChanges {
  @Input('appBtnStyle') styleVal;

  constructor(private element: ElementRef) {}

  ngAfterViewInit(): void {
    this.applyStyle();
  }

  ngOnInit() {
    this.applyStyle();
  }

  ngOnChanges() {
    this.applyStyle();
  }

  applyStyle() {
    if (!this.styleVal || this.styleVal === 'default') {
      this.element.nativeElement.setAttribute('fill', 'clear');
      //this.element.nativeElement.setAttribute('color', 'text-dark-2');
    } else if (this.styleVal === 'outline') {
      this.element.nativeElement.setAttribute('fill', 'outline');
      //this.element.nativeElement.setAttribute('color', 'text-dark-2');
    }
  }
}

@Directive({
  selector: '[appTextHeight]'
})
export class ButtonTextHeightDirective
  implements OnInit, AfterViewInit, OnChanges {
  @Input('appTextHeight') textHeightVal;

  constructor(private element: ElementRef) {}

  ngAfterViewInit(): void {
    this.applyStyle();
  }

  ngOnInit() {
    this.applyStyle();
  }

  ngOnChanges() {
    this.applyStyle();
  }

  applyStyle() {
    this.element.nativeElement.style['--height'] = '1.1em';
  }
}
