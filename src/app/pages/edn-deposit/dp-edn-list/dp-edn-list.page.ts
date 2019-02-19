import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory = 'add edn';

@Component({
  selector: 'app-dp-edn-list',
  templateUrl: './dp-edn-list.page.html',
  styleUrls: ['./dp-edn-list.page.scss']
})
export class DpEdnListPage implements OnInit {
  constructor(private rs: RouterService, private analytics: AnalyticsService) {}

  ngOnInit() {}
  onAddFromEthClick() {
    this.analytics.logEvent({
      category: AnalyticsCategory,
      params: {
        action: 'add from eth click',
        event_label: 'add from eth_add from eth click'
      }
    });

    this.rs.navigateByUrl('/dp-edn-main');
  }
}
