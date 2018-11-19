import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service'
import { ClipboardService } from 'ngx-clipboard';

@Component({
  selector: 'app-ew-qrcode',
  templateUrl: './ew-qrcode.page.html',
  styleUrls: ['./ew-qrcode.page.scss'],
})
export class EwQrcodePage implements OnInit {

  private qrCodeData = 'ethereum:0x5D09F493d1d2c2C5F218c43e2aC16f051D436976';

  constructor(private rs: RouterService, private cbService: ClipboardService) {}

  ngOnInit() {}
  onBackBtnClick() {
    this.rs.goBack();
  }

  private onQrCodeClick() {
    this.cbService.copyFromContent(this.qrCodeData);
  }
}