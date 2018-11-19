import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

@Component({
  selector: 'app-backup-wallet',
  templateUrl: './backup-wallet.page.html',
  styleUrls: ['./backup-wallet.page.scss'],
})
export class BackupWalletPage implements OnInit {

  userInputWords: Array < string > = ["aaa", "bbb", "ccc", "aaa", "bbb", "ccc", "aaa"];
  userSelectWords: Array < string > = ["aaa", "bbb", "ccc"];

  constructor(private rs: RouterService) {}

  ngOnInit() {

  }

  onVerifyBtnClick() {
    this.rs.goTo('/home');
  }

}