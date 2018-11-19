import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-ew-main',
  templateUrl: './ew-main.page.html',
  styleUrls: ['./ew-main.page.scss'],
})
export class EwMainPage implements OnInit {

  constructor(private logger: NGXLogger, private rs: RouterService) {

  }

  ngOnInit() {}

  onBackBtnClick() {
    this.rs.goBack();
  }
}