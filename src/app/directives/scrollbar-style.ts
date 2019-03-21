import { Directive, ElementRef, Input, OnChanges, OnInit } from '@angular/core';

@Directive({
  selector: '[appScrollbarStyle]'
})
export class ScrollbarStyleDirective implements OnInit {
  ngOnInit() {
    const shadow = this.el.nativeElement.shadowRoot || this.el.nativeElement.attachShadow({ mode: 'open' });
    if (shadow) {
      let innerHTML = '';
      innerHTML += '<style>';
      innerHTML += '::-webkit-scrollbar { width: auto; }';
      innerHTML += '::-webkit-scrollbar-thumb { background: #aaaaaa; }';
      innerHTML += '</style>';
      shadow.innerHTML += innerHTML;
    }
  }

  constructor(private el: ElementRef) {}
}
