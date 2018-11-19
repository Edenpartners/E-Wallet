import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

@Component({
  selector: 'app-dp-edn-list',
  templateUrl: './dp-edn-list.page.html',
  styleUrls: ['./dp-edn-list.page.scss'],
})
export class DpEdnListPage implements OnInit {

  constructor(private rs: RouterService) {}

  ngOnInit() {}
  onAddFromEthClick() {
    this.rs.goTo('/dp-edn-main');
  }

}