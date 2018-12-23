import {
  InjectionToken,
  Injectable,
  Inject,
  OnInit,
  OnDestroy
} from '@angular/core';

import { Component } from '@angular/core';
import { LoadingController, Events } from '@ionic/angular';
import { NGXLogger } from 'ngx-logger';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { Map } from '../utils/listutil';
import { UUID } from 'angular2-uuid';

export interface AlertOptions {
  title?: string | undefined;
  message?: string | undefined;
  buttons?: Array<any> | undefined;
}

class InnerLoadingHandler {
  private loadingElement: HTMLIonLoadingElement;
  private dismissLoading = false;
  private creatingLoading = false;

  constructor(private loadingController: LoadingController) {}

  show(msg?: string): Promise<any> {
    const thisRef = this;
    this.creatingLoading = true;

    return new Promise<any>(async (finalResolve, finalReject) => {
      thisRef.loadingElement = await this.loadingController.create({
        message: msg
      });
      await this.loadingElement.present();
      this.creatingLoading = false;

      if (this.dismissLoading) {
        this.dismissLoading = false;
        this.hide();
      }

      finalResolve();
    });
  }

  hide() {
    console.log('hide loading');
    if (this.creatingLoading) {
      this.dismissLoading = true;
      return;
    }

    if (this.loadingElement !== undefined && this.loadingElement !== null) {
      this.loadingElement
        .dismiss()
        .then(
          value => {},
          err => {
            console.log(err);
          }
        )
        .finally(() => {});
      this.loadingElement = null;
    }
  }
}

export class LoadingHandler {
  private innerHandler: InnerLoadingHandler = null;
  private canBlockBackButton = true;

  constructor(
    private loadingController: LoadingController,
    private events: Events,
    private logger: NGXLogger,
    private _key?: string
  ) {}

  get key(): string {
    return this._key;
  }

  show(msg?: string): Promise<any> {
    this.hide(false);

    this.innerHandler = new InnerLoadingHandler(this.loadingController);
    return this.innerHandler.show(msg);
  }

  hide(dispatchEvent = true) {
    if (this.innerHandler) {
      this.innerHandler.hide();
      this.innerHandler = null;

      if (dispatchEvent) {
        this.logger.info('hide loading : ' + this.key);
        this.events.publish('ui.loading.hide', this.key);
      }
    }
  }
}

class AlertHandler {
  constructor(
    public alertElement: HTMLIonAlertElement,
    public opt: AlertOptions
  ) {}
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackUIService {
  constructor(
    private logger: NGXLogger,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private translate: TranslateService,
    private toastController: ToastController,
    private events: Events
  ) {
    this.events.subscribe('ui.loading.hide', key => {
      this.hideLoading(key);
    });
  }

  private loadingMap: Array<LoadingHandler> = [];
  private alertMap: Array<AlertHandler> = [];

  hasLoading(key?: string): boolean {
    if (key) {
      const loadingItem = this.loadingMap.find(item => {
        if (key === item.key) {
          return true;
        }
        return false;
      });

      if (loadingItem) {
        return true;
      }
      return false;
    } else {
      return this.loadingMap.length > 0;
    }
  }

  showRandomKeyLoading(msg?: string): LoadingHandler {
    return this.showLoading(msg, null);
  }

  showLoading(msg?: string, key: string | null = '_default_'): LoadingHandler {
    this.hideLoading(key);

    if (!key) {
      key = UUID.UUID();
    }

    const handler = new LoadingHandler(
      this.loadingController,
      this.events,
      this.logger,
      key
    );
    this.loadingMap.push(handler);

    this.logger.info('show loading : ' + key + ', ' + this.loadingMap.length);

    handler.show(msg);
    return handler;
  }

  hideLoading(key: string = '_default_') {
    for (let i = 0; i < this.loadingMap.length; i++) {
      const loadingItem = this.loadingMap[i];
      if (key === loadingItem.key) {
        this.logger.info('found loading : ' + key + ', ' + i);
        this.loadingMap.splice(i, 1);
        this.logger.info(
          'remove loading : ' + loadingItem.key + ', ' + this.loadingMap.length
        );

        loadingItem.hide();
        break;
      }
    }
  }

  generateDialogOpt(opt: AlertOptions | string | Error): AlertOptions {
    let result: AlertOptions = null;
    if (typeof opt === 'string') {
      const message = opt;
      result = {
        message: message
      };
    } else if (opt instanceof Error) {
      result = {
        message: opt.message
      };
    } else {
      result = opt;
    }

    return result;
  }

  hasAlert(): boolean {
    if (this.alertMap.length > 0) {
      return true;
    }
    return false;
  }

  popLastAlert() {
    if (this.alertMap.length < 1) {
      return;
    }

    const lastIndex = this.alertMap.length - 1;
    const lastAlertHandler: AlertHandler = this.alertMap[lastIndex];
    this.alertMap.splice(lastIndex, 1);

    lastAlertHandler.alertElement.dismiss();

    if (lastAlertHandler.opt.buttons) {
      const buttons = lastAlertHandler.opt.buttons;
      let dismissWithBtn = null;

      //it is cancel handler (maybe).
      if (buttons.length === 1) {
        dismissWithBtn = buttons[0];
      }

      if (dismissWithBtn && dismissWithBtn.handler) {
        dismissWithBtn.handler();
      }
    }
  }

  async showAlertDialog(opt: AlertOptions | string | Error) {
    opt = this.generateDialogOpt(opt);

    if (opt.title === undefined) {
      opt.title = await this.translate.instant('Alert');
    }

    if (opt.buttons === undefined) {
      const okTitle: string = await this.translate.instant('OK');
      opt.buttons = [okTitle];
    }

    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: opt.title,
      message: opt.message,
      buttons: opt.buttons
    });

    const alertHandler = new AlertHandler(alert, opt);
    const alertRemover = () => {
      this.logger.info('alert dismissed');
      for (let i = 0; i < this.alertMap.length; i++) {
        if (Object.is(this.alertMap[i], alertHandler)) {
          this.alertMap.splice(i, 1);
        }
      }
    };

    this.alertMap.push(alertHandler);
    alert.onDidDismiss().then(alertRemover);

    return await alert.present();
  }

  async showWarningDialog(opt: AlertOptions | string | Error) {
    opt = this.generateDialogOpt(opt);

    if (opt.title === undefined) {
      opt.title = await this.translate.instant('Warning');
    }

    return this.showAlertDialog(opt);
  }

  async showErrorDialog(opt: AlertOptions | string | Error) {
    opt = this.generateDialogOpt(opt);

    if (opt.title === undefined) {
      opt.title = await this.translate.instant('Error');
    }

    return this.showAlertDialog(opt);
  }

  async showErrorAndRetryDialog(
    opt: AlertOptions | string | Error,
    onRetry: () => void = () => {},
    onCancel: () => void = () => {}
  ) {
    opt = this.generateDialogOpt(opt);

    if (opt.title === undefined) {
      opt.title = this.translate.instant('Error');
    }

    if (opt.buttons === undefined) {
      opt.buttons = [
        {
          text: this.translate.instant('Cancel'),
          role: 'cancel',
          handler: onCancel
        },
        {
          text: this.translate.instant('Retry'),
          handler: onRetry
        }
      ];
    }

    return this.showAlertDialog(opt);
  }

  async showToast(message: string | Error, duration = 3000) {
    let toastMessage: string = null;
    if (typeof message === 'string') {
      toastMessage = message;
    } else if (message !== undefined && message instanceof Error) {
      toastMessage = message.message;
    }

    const toast = await this.toastController.create({
      message: toastMessage,
      duration: duration
    });
    toast.present();
  }
}
