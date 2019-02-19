import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory = 'add wallet';

@Component({
  selector: 'app-add-wallet',
  templateUrl: './add-wallet.page.html',
  styleUrls: ['./add-wallet.page.scss']
})
export class AddWalletPage implements OnInit, OnDestroy {
  constructor(
    private rs: RouterService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {}

  onCreateBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'new wallet click',
        event_label: 'new wallet_new wallet click'
      }
    });

    this.rs.navigateByUrl('/backup-notice');
  }
  onImportBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'import wallet click',
        event_label: 'import wallet_import wallet click'
      }
    });

    this.rs.navigateByUrl('/import-wallet');
  }
}
