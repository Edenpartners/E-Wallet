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


@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,

    ClipboardModule,
    WebStorageModule,

    // Logging
    LoggerModule.forRoot({
      disableConsoleLogging: false, level: NgxLoggerLevel.DEBUG,
      serverLoggingUrl: null, serverLogLevel: NgxLoggerLevel.ERROR }),
  ],
  exports: [
    ClipboardModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
