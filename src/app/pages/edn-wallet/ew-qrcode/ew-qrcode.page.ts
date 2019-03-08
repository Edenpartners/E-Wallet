import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ClipboardService } from 'ngx-clipboard';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { SubscriptionPack } from '../../../utils/listutil';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { AppStorageTypes, AppStorageService } from '../../../providers/appStorage.service';
import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';
import { EwSummary } from '../ew-summary/ew-summary';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory = 'edn transaction2';

@Component({
  selector: 'app-ew-qrcode',
  templateUrl: './ew-qrcode.page.html',
  styleUrls: ['./ew-qrcode.page.scss']
})
export class EwQrcodePage implements OnInit, OnDestroy {
  qrCodeData = '';

  private subscriptionPack: SubscriptionPack = new SubscriptionPack();
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  @ViewChild('summary') summary: EwSummary;

  constructor(
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute,
    private cbService: ClipboardService,
    private storage: AppStorageService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.logger.debug('will enter qr');
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.params.subscribe(params => {
        try {
          this.walletId = String(params['id']); // (+) converts string 'id' to a number
          this.wallet = this.storage.findWalletById(this.walletId);
          const prefix = '';
          this.qrCodeData = prefix + this.wallet.address;
          this.logger.debug('a wallet ' + this.wallet.id);

          this.summary.startGetInfo(this.walletId);
        } catch (e) {
          this.logger.debug(e);
        }
      });
    });
  }

  ionViewWillLeave() {
    this.logger.debug('will leave qr');
    this.summary.stopGetInfo();
  }
  ionViewDidLeave() {
    this.logger.debug('did leave qr');
    this.subscriptionPack.clear();
  }

  onBackBtnClick() {
    this.rs.goBack();
  }

  async onQrCodeClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'qr code click',
        event_label: 'qr code_qr code click'
      }
    });

    this.cbService.copyFromContent(this.qrCodeData);
    this.feedbackUI.showToast(this.translate.instant('wallet.address.copied'));
  }

  onShareBtnClick() {}
}
