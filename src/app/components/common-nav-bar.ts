import { Component, OnInit, Input } from '@angular/core';
import { RouterService } from '../providers/router.service';

@Component({
  selector: 'common-nav-bar',
  template: `
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button (click)="onBackBtnClick()">
          <ion-icon name="arrow-back"></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title | translate }}</ion-title>
    </ion-toolbar>
  `,
  styles: [`
  `],
})
export class CommonNavBar implements OnInit {
  @Input('title') title;

  constructor(private rs: RouterService) {}

  ngOnInit() {}
  onBackBtnClick() {
    this.rs.goBack();
  }

}