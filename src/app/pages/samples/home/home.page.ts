import { Component } from '@angular/core';
import { EthService } from '../../../providers/ether.service';
import { ConfigService } from '../../../providers/config.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(public web3: EthService, public cfg: ConfigService) {
  }
}
