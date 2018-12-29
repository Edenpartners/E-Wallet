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
    <ion-toolbar mode="md">
      <ion-buttons slot="start">
        <ion-button (click)="onBackBtnClick()">
          <ion-icon
            src="/assets/img/back.svg"
            color="text-light-1"
            style="width:.8em; height:.8em;"
          ></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title class="fw-bold">{{ title }}</ion-title>
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
