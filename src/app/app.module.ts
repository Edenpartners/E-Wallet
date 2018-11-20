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
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { DirectivesModule } from './directives/directives.module';
import { CommonNavBar } from './components/common-nav-bar';
import { ComponentsModule } from './components/components.module';
import { SharedPageModule } from './modules/shared.page.module';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ComponentsModule,

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
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    })
  ],
  exports: [
    ClipboardModule,
    NgxQRCodeModule,
    ComponentsModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}