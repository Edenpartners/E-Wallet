import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ClipboardService } from 'ngx-clipboard';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { SubscriptionPack } from '../../../utils/listutil';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

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

  constructor(
    private logger: NGXLogger,
    private rs: RouterService,
    private aRoute: ActivatedRoute,
    private cbService: ClipboardService,
    private toastController: ToastController,
    private storage: AppStorageService
  ) {}

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
        let prefix = '';
        if (this.wallet.type === WalletTypes.WalletType.Ethereum) {
          prefix = `${WalletTypes.WalletType.Ethereum.toLowerCase()}:`;
        }
        this.qrCodeData = prefix + this.wallet.address;
        this.logger.debug('a wallet ' + this.wallet.id);
      });
    });
  }
  ngOnDestroy() {
    this.subscriptionPack.clear();
  }
  onBackBtnClick() {
    this.rs.goBack();
  }

  private async onQrCodeClick() {
    this.cbService.copyFromContent(this.qrCodeData);
    const toast = await this.toastController.create({
      message: 'The wallet address has been placed in the clipboard.',
      duration: 3000
    });
    toast.present();
  }
}
