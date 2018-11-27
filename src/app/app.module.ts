import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LoggerModule, NgxLoggerLevel, LoggerConfig } from 'ngx-logger';
import { ClipboardModule } from 'ngx-clipboard';
import { WebStorageModule } from 'ngx-store';
import { NgxQRCodeModule } from 'ngx-qrcode2';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP } from '@ionic-native/http/ngx';
import { AppVersion } from '@ionic-native/app-version/ngx';

//===== firebase
import { AngularFireModule } from '@angular/fire';
import {
  AngularFireDatabaseModule,
  AngularFireDatabase
} from '@angular/fire/database';
import { AngularFireAuthModule, AngularFireAuth } from '@angular/fire/auth';
import { TwitterConnect } from '@ionic-native/twitter-connect/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Facebook } from '@ionic-native/facebook/ngx';
//=====

import { environment } from '../environments/environment';
import { FormsModule } from '@angular/forms';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule,
    AppRoutingModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,

    ClipboardModule,
    WebStorageModule,
    NgxQRCodeModule,

    // Logging
    LoggerModule.forRoot({
      disableConsoleLogging: false,
      level: NgxLoggerLevel.DEBUG,
      serverLoggingUrl: null,
      serverLogLevel: NgxLoggerLevel.ERROR
    }),

    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
  ],
  exports: [ClipboardModule, NgxQRCodeModule],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    HTTP,
    AppVersion,

    AngularFireDatabase,
    AngularFireAuth,
    Facebook,
    TwitterConnect,
    GooglePlus
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
