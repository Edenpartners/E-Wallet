import { Injectable, OnInit, OnDestroy, NgModule } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { FirebaseAnalytics } from '@ionic-native/firebase-analytics/ngx';
import { env } from '../../environments/environment';
import { SubscriptionPack } from '../utils/listutil';
import { Router, Route, UrlSegment, RouterEvent, NavigationEnd } from '@angular/router';
import { RouterService } from './router.service';
import { Platform } from '@ionic/angular';
import { ClipboardService as NgxClipboard } from 'ngx-clipboard';
import { Clipboard as IonicClipboard } from '@ionic-native/clipboard/ngx';

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  constructor(private platform: Platform, private ngxClipboard: NgxClipboard, private ionicIonicClipboard: IonicClipboard) {}
  copyText(content: string) {
    if (this.platform.is('cordova') && this.platform.is('mobile')) {
      this.ionicIonicClipboard.copy(content);
    } else {
      this.ngxClipboard.copyFromContent(content);
    }
  }

  pasteText(): Promise<string> {
    return new Promise<string>((finalResolve, finalReject) => {
      if (this.platform.is('cordova') && this.platform.is('mobile')) {
        this.ionicIonicClipboard.paste().then(
          content => {
            finalResolve(content);
          },
          error => {
            finalReject(error);
          }
        );
      } else {
        finalReject(new Error());
      }
    });
  }
}
