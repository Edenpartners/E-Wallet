import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { AnalyticsService, AnalyticsEvent } from '../../../providers/analytics.service';

const AnalyticsCategory = 'add edn';

@Component({
  selector: 'app-add-edn-list',
  templateUrl: './add-edn-list.page.html',
  styleUrls: ['./add-edn-list.page.scss']
})
export class AddEdnListPage implements OnInit {
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

    this.rs.navigateByUrl('/add-edn-eth');
  }
}
