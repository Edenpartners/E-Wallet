import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory = 'backup wallet1';

@Component({
  selector: 'app-backup-notice',
  templateUrl: './backup-notice.page.html',
  styleUrls: ['./backup-notice.page.scss']
})
export class BackupNoticePage implements OnInit {
  constructor(public rs: RouterService, private analytics: AnalyticsService) {}

  ngOnInit() {}

  onReadyBackupBtnClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'writeitdown click',
        event_label: 'writeitdown_writeitdown click'
      }
    });

    this.rs.navigateByUrl('/backup-wallet');
  }
}
