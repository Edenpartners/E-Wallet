import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

@Component({
  selector: 'app-tw-main',
  templateUrl: './tw-main.page.html',
  styleUrls: ['./tw-main.page.scss'],
})
export class TwMainPage implements OnInit {

  constructor(private rs: RouterService) {}

  ngOnInit() {}
  
}