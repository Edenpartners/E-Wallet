import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-ew-tx-list',
  templateUrl: './ew-tx-list.page.html',
  styleUrls: ['./ew-tx-list.page.scss'],
})
export class EwTxListPage implements OnInit {

  name = 0;

  constructor() {}

  ngOnInit() {}

  onSendBtnClick() {
    this.name += 1;
  }
}