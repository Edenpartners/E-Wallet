import { Component, OnInit } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { NGXLogger } from 'ngx-logger';
import { FeedbackUIService, AlertOptions } from 'src/app/providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';
import { SubscriptionPack } from 'src/app/utils/listutil';
import { Consts } from 'src/environments/constants';
import { RouterService } from 'src/app/providers/router.service';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-qrscanner',
  templateUrl: './qrscanner.page.html',
  styleUrls: ['./qrscanner.page.scss']
})
export class QrscannerPage implements OnInit {
  scanResult: any = null;

  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  constructor(
    private logger: NGXLogger,
    private qrScanner: QRScanner,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private rs: RouterService,
    private platform: Platform
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    this.subscriptionPack.addSubscription(() => {
      return this.platform.pause.subscribe(() => {
        this.closeModal();
      });
    });
  }

  ionViewDidEnter() {
    this.onScanQRBtnClick();
  }

  ionViewWillLeave() {
    this.dispatchQREvent(this.scanResult);
    this.closeScanner();
  }

  startScanner() {
    const allPages = document.getElementsByClassName('ion-page');
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      page.classList.add('transparent-page');
      if (this.isNormalPage(page)) {
        page.classList.add('hidden-page');
      }
    }
    //ionApp.style.display = 'none';
  }

  isNormalPage(el: Element): boolean {
    const tagName = el.tagName.toLowerCase().trim();
    this.logger.debug('tagName', tagName);
    if (tagName !== 'ion-app' && tagName !== 'app-qrscanner') {
      this.logger.debug('this is normal page');
      return true;
    }
    return false;
  }

  closeScanner() {
    const allPages = document.getElementsByClassName('ion-page');
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      page.classList.remove('transparent-page');
      if (this.isNormalPage(page)) {
        page.classList.remove('hidden-page');
      }
    }
    //ionApp.style.display = 'block';

    this.qrScanner.hide();
    this.subscriptionPack.removeSubscriptionsByKey('qrscan');
  }

  closeModal() {
    this.events.publish(Consts.EVENT_CLOSE_MODAL);
  }

  gotoAppPermissionSettings() {
    const opt: AlertOptions = {};
    opt.title = this.translate.instant('Error');
    opt.message = this.translate.instant('valid.qrcode.permission');

    if (opt.buttons === undefined) {
      opt.buttons = [
        {
          text: this.translate.instant('OK'),
          handler: () => {
            this.qrScanner.openSettings();
            this.closeModal();
          }
        }
      ];
    }
    this.feedbackUI.showAlertDialog(opt);
  }

  dispatchQREvent(result: any) {
    this.events.publish(Consts.EVENT_QR_SCAN_RESULT, result);
  }

  onCancelQRBtnClick() {
    this.closeModal();
  }

  onScanQRBtnClick() {
    this.logger.debug('start qr sncan');

    this.qrScanner.prepare().then(
      (status: QRScannerStatus) => {
        this.logger.debug('qr status : ', status);

        if (status.authorized) {
          this.qrScanner.show().then(
            () => {
              this.startScanner();

              this.subscriptionPack.addSubscription(() => {
                return this.qrScanner.scan().subscribe(
                  (text: string) => {
                    this.scanResult = text;
                    this.closeModal();
                  },
                  (scanError: any) => {
                    this.feedbackUI.showErrorDialog(scanError);
                    this.closeModal();
                  }
                );
              }, 'qrscan');
            },
            showError => {
              this.feedbackUI.showErrorDialog(showError);
              this.closeModal();
            }
          );
        } else if (status.denied) {
          this.logger.debug('qr camera permission was permanently denied.');
          // camera permission was permanently denied
          // you must use QRScanner.openSettings() method to guide the user to the settings page
          // then they can grant the permission from there
          this.gotoAppPermissionSettings();
        } else {
          this.logger.debug('qr permission was denied, but not permanently.');
          // permission was denied, but not permanently. You can ask for permission again at a later time.
        }
      },
      error => {
        //this.startScanner();

        this.logger.debug('qr prepare failed');
        this.gotoAppPermissionSettings();
      }
    );
  }
}
