import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

@Component({
  selector: 'app-dp-edn-main',
  templateUrl: './dp-edn-main.page.html',
  styleUrls: ['./dp-edn-main.page.scss'],
})
export class DpEdnMainPage implements OnInit {

  selectedTrader = 'Kyber Networks';

  constructor(private rs: RouterService) {

  }

  ngOnInit() {}

}