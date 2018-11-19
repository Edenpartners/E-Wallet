import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../providers/router.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage implements OnInit {

  constructor(private rs: RouterService) {}

  ngOnInit() {}

}