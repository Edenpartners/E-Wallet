import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { Input } from '@ionic/angular';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-pc-edit',
  templateUrl: './pc-edit.page.html',
  styleUrls: ['./pc-edit.page.scss'],
})
export class PcEditPage implements OnInit {

  constructor(private logger: NGXLogger, private rs: RouterService) {}

  ngOnInit() {}

}