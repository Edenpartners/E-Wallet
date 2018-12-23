import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ClipboardService } from 'ngx-clipboard';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { SubscriptionPack } from '../../../utils/listutil';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';
import { FeedbackUIService } from '../../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '@ionic/angular';

@Component({
  selector: 'app-ew-qrcode',
  templateUrl: './ew-qrcode.page.html',
  styleUrls: ['./ew-qrcode.page.scss']
})
export class EwQrcodePage implements OnInit, OnDestroy {
  private qrCodeData = '';

  private subscriptionPack: SubscriptionPack = new SubscriptionPack();
  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  @ViewChild('background') background: ElementRef;

  constructor(
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute,
    private cbService: ClipboardService,
    private storage: AppStorageService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService,
    private events: Events
  ) {}

  ngOnInit() {}
  ngOnDestroy() {}

  ionViewWillEnter() {
    this.events.subscribe('set.ew-main.height', height => {
      this.background.nativeElement.style.height = height;
    });
    this.events.publish('get.ew-main.height');

    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
        const prefix = '';
        this.qrCodeData = prefix + this.wallet.address;
        this.logger.debug('a wallet ' + this.wallet.id);
      });
    });
  }

  ionViewDidLeave() {
    this.events.unsubscribe('set.ew-main.height');
    this.subscriptionPack.clear();
  }
  onBackBtnClick() {
    this.rs.goBack();
  }

  private async onQrCodeClick() {
    this.cbService.copyFromContent(this.qrCodeData);
    this.feedbackUI.showToast(this.translate.instant('wallet.address.copied'));
  }
}
