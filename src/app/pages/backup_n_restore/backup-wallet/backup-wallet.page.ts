import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-backup-wallet',
  templateUrl: './backup-wallet.page.html',
  styleUrls: ['./backup-wallet.page.scss'],
})
export class BackupWalletPage implements OnInit {

  userInputWords: Array < string > = ["aaa", "bbb", "ccc", "aaa", "bbb", "ccc", "aaa", "bbb", "ccc",
    "aaa", "bbb", "ccc", "aaa", "bbb", "ccc", "aaa", "bbb", "ccc"
  ];
  userSelectWords: Array < string > = ["aaa", "bbb", "ccc"];

  constructor() {}

  ngOnInit() {

  }

}