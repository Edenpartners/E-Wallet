import { Component, OnInit, Input, EventEmitter, Output, OnDestroy, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterService } from '../providers/router.service';
import { IonComponentUtils } from '../utils/ion-component-utils';
import { SubscriptionPack } from '../utils/listutil';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Platform } from '@ionic/angular';
import { SharedPageModule } from '../modules/shared.page.module';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '../directives/directives.module';
import { ComponentsModule } from '../components/components.module';

@Component({
  selector: 'common-nav-bar',
  template: `
    <ion-toolbar mode="md">
      <ion-buttons slot="start">
        <ion-button [hidden]="hideBackButton" (click)="onBackBtnClick()" style="margin-left:8px;">
          <ion-icon src="/assets/img/back.svg" color="text-light-1" style="width:13px; height:22px;"></ion-icon>
        </ion-button>
      </ion-buttons>
      <ion-title class="fw-bold font-size-18 margin-left-30">{{ title }}</ion-title>
      <ion-buttons slot="end">
        <ng-content select=".right-item"></ng-content>
      </ion-buttons>
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
export class CommonNavBar implements OnInit, OnDestroy {
  @Input() title;
  @Input() hideBackButton: Boolean = false;

  @Output() handleBack = new EventEmitter<any>();

  subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(private rs: RouterService, private keyboard: Keyboard, private platform: Platform) {}

  ngOnInit() {}
  ngOnDestroy() {}

  onBackBtnClick() {
    if (this.platform.is('android') || this.platform.is('ios')) {
      if (IonComponentUtils.isWindowSizeIsSmall()) {
        this.keyboard.hide();
        IonComponentUtils.blurActiveElement();
        return;
      }
    }

    this.keyboard.hide();
    IonComponentUtils.blurActiveElement();

    if (this.handleBack.observers.length > 0) {
      this.handleBack.emit();
    } else {
      const thisRef = this;
      const goBackWorker = () => {
        thisRef.rs.goBack();
      };

      goBackWorker();
      //setTimeout(goBackWorker, 100);
    }
  }
}

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, TranslateModule, DirectivesModule],
  declarations: [CommonNavBar],
  exports: [CommonNavBar],
  schemas: []
})
export class CommonNavBarModule {}
