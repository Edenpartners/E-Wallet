import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  OnDestroy
} from '@angular/core';
import { RouterService } from '../providers/router.service';

@Component({
  selector: 'common-nav-bar',
  template: `
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button (click)="onBackBtnClick()">
          <ion-icon name="arrow-back" color="text-light-1"></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
    </ion-toolbar>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class CommonNavBar implements OnInit {
  @Input() title;
  @Output() handleBack = new EventEmitter<any>();

  constructor(private rs: RouterService) {}

  ngOnInit() {}
  onBackBtnClick() {
    if (this.handleBack.observers.length > 0) {
      this.handleBack.emit();
    } else {
      this.rs.goBack();
    }
  }
}
