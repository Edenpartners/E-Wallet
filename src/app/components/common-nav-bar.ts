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
        <ion-button (click)="onBackBtnClick()" style="margin-left:8px;">
          <ion-icon
            src="/assets/img/back.svg"
            color="text-light-1"
            style="width:13px; height:22px;"
          ></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title class="fw-bold font-size-18 margin-left-30">{{
        title
      }}</ion-title>
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
