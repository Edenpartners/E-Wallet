import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output
} from '@angular/core';

import { EthService } from '../../providers/ether.service';
import { ethers } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'ngx-clipboard';
import { EtherDataService } from '../../providers/etherData.service';
import { FeedbackUIService } from '../../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'bip39-handler',
  template: `
    <ion-grid class="bordered-grid">
      <ion-row>
        <ion-col size="auto" class="no-border">
          <ion-label>BIP-39 (12 Words)</ion-label>
        </ion-col>
        <ion-textarea placeholder="" [(ngModel)]="mnemonicWords"></ion-textarea>
      </ion-row>
      <ion-row>
        <ion-col size="auto" class="no-border">
          <ion-label>Wallet Index</ion-label>
        </ion-col>
        <ion-col size="auto">
          <ion-input
            placeholder=""
            [(ngModel)]="restoreWalletIndex"
          ></ion-input>
        </ion-col>
      </ion-row>
      <ion-row>
        <ion-col size="auto" class="no-border">
          <ion-button color="light" (click)="generateRandomMnemonic()"
            >Generate</ion-button
          >
        </ion-col>
        <ion-col size="auto" class="no-border">
          <ion-button
            color="light"
            (click)="copyMWToCliboard()"
            class="margin-left"
            >Copy</ion-button
          >
        </ion-col>
      </ion-row>
    </ion-grid>
  `,
  styleUrls: ['./tester.scss']
})
export class Bip39Handler implements OnInit, OnDestroy {
  mnemonicWords = '';
  restoreWalletIndex = 0;

  @Output() restoreApply = new EventEmitter<{ mw: string; path: string }>();

  constructor(
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private feedbackUI: FeedbackUIService,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {}

  generateRandomMnemonic() {
    this.mnemonicWords = ethers.Wallet.createRandom().mnemonic;
  }

  copyMWToCliboard() {
    this.copyToClipboard(this.getTrimmedMWords());
  }
  copyToClipboard(text: string) {
    this.cbService.copyFromContent(text);
  }

  getTrimmedMWords() {
    return this.mnemonicWords.trim();
  }

  getBIP39DerivationPath() {
    return this.etherData.getBIP39DerivationPath(
      String(this.restoreWalletIndex)
    );
  }

  // @link : https://docs.ethers.io/ethers.js/html/api-wallet.html
  restoreWallet() {
    const mWords = this.getTrimmedMWords();
    if (mWords.length < 1) {
      this.feedbackUI.showErrorDialog({ message: 'mnemonic words required' });
      return;
    }

    const path = this.etherData.getBIP39DerivationPath(
      String(this.restoreWalletIndex)
    );
    this.restoreApply.emit({ mw: mWords, path: path });
  }
}
