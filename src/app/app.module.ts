import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LoggerModule, NgxLoggerLevel, LoggerConfig } from 'ngx-logger';
import { ClipboardModule } from 'ngx-clipboard';
import { WebStorageModule } from 'ngx-store';
import { QRCodeModule } from 'angularx-qrcode';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HTTP } from '@ionic-native/http/ngx';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Deeplinks } from '@ionic-native/deeplinks/ngx';

//===== firebase
import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabaseModule, AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuthModule, AngularFireAuth } from '@angular/fire/auth';
import { TwitterConnect } from '@ionic-native/twitter-connect/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Facebook } from '@ionic-native/facebook/ngx';

import { FirebaseAnalytics } from '@ionic-native/firebase-analytics/ngx';

//=====

import { environment } from '../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PinCodePageModule } from './pages/pin-code/pin-code/pin-code.module';
import { PrivacyPolicyPageModule } from './pages/signup-profile/privacy-policy/privacy-policy.module';
import { TermsAndConditionPageModule } from './pages/signup-profile/terms-and-condition/terms-and-condition.module';

import { env } from '../environments/environment';
import { Keyboard } from '@ionic-native/keyboard/ngx';

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
    ReactiveFormsModule,
    AppRoutingModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,

    ClipboardModule,
    WebStorageModule,
    QRCodeModule,
    // Logging
    LoggerModule.forRoot({
      disableConsoleLogging: env.config.disableConsoleLogging,
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
    }),

    PinCodePageModule,
    PrivacyPolicyPageModule,
    TermsAndConditionPageModule
  ],
  exports: [ClipboardModule, QRCodeModule],
  providers: [
    InAppBrowser,
    StatusBar,
    SplashScreen,
    Keyboard,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    HTTP,
    AppVersion,
    Deeplinks,

    AngularFireDatabase,
    AngularFireAuth,
    Facebook,
    TwitterConnect,
    GooglePlus,
    FirebaseAnalytics
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
