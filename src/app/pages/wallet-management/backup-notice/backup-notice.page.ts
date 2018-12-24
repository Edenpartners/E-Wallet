import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

@Component({
  selector: 'app-backup-notice',
  templateUrl: './backup-notice.page.html',
  styleUrls: ['./backup-notice.page.scss']
})
export class BackupNoticePage implements OnInit {
  constructor(public rs: RouterService) {}

  ngOnInit() {}
}
