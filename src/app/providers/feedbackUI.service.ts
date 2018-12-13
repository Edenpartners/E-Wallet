import {
  InjectionToken,
  Injectable,
  Inject,
  OnInit,
  OnDestroy
} from '@angular/core';

import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { NGXLogger } from 'ngx-logger';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';

export interface AlertOptions {
  title?: string | undefined;
  message?: string | undefined;
  buttons?: Array<any> | undefined;
}

export class LoadingHandler {
  private loadingElement: HTMLIonLoadingElement;
  private creatingLoading = false;
  private dismissLoading = false;

  constructor(private loadingController: LoadingController) {}

  show(msg?: string): Promise<any> {
    this.hide();

    if (this.creatingLoading) {
      return;
    }

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

@Injectable({
  providedIn: 'root'
})
export class FeedbackUIService {
  constructor(
    private logger: NGXLogger,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private translate: TranslateService,
    private toastController: ToastController
  ) {}

  private loadingMap: any = {};

  createLoading(msg?: string): LoadingHandler {
    const handler = new LoadingHandler(this.loadingController);
    handler.show(msg);
    return handler;
  }

  showLoading(msg?: string, key: string = '_default_'): LoadingHandler {
    if (this.loadingMap[key]) {
      return;
    }

    const handler = new LoadingHandler(this.loadingController);
    this.loadingMap[key] = handler;
    handler.show(msg);
    return handler;
  }

  hideLoading(key: string = '_default_') {
    if (!this.loadingMap[key]) {
      return;
    }

    const handler: LoadingHandler = this.loadingMap[key];
    handler.hide();
    delete this.loadingMap[key];
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

  async showAlertDialog(opt: AlertOptions | string | Error) {
    opt = this.generateDialogOpt(opt);

    if (opt.title === undefined) {
      opt.title = await this.translate.instant('Alert');
    }

    if (opt.buttons === undefined) {
      const okTitle: string = await this.translate.instant('OK');
      opt.buttons = [okTitle];
    }

    const alert = await this.alertController.create({
      header: opt.title,
      message: opt.message,
      buttons: opt.buttons
    });

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
