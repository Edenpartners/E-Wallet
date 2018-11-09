import { Component, OnInit, Inject } from '@angular/core';
import { EthService, EthProvider } from '../../providers/ether.service';
import { ConfigService } from '../../providers/config.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-ethtest',
  templateUrl: './ethtest.page.html',
  styleUrls: ['./ethtest.page.scss']
})
export class EthtestPage implements OnInit {

  title = '';
  currentNum = 0;
  connectionAddr = 'http://localhost:8545';

  providers: Array<EthProvider>;

  constructor(public cfg: ConfigService, public web3: EthService, private logger: NGXLogger) { }

  ngOnInit() {
    this.web3.providers.forEach( item => {
        item.isConnectedOb.subscribe((val) => {
          this.logger.debug('connection value was changed to : ', val);
        });
      }
    );

    this.title = this.cfg.say();
    console.log(this.cfg.say());
  }

  onAddButtonClick() {
    this.currentNum = this.cfg.addNum();
  }

}
