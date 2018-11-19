import { Component, OnInit } from '@angular/core';
import { RouterService } from '../../providers/router.service';

@Component({
  selector: 'app-signup-profile',
  templateUrl: './signup-profile.page.html',
  styleUrls: ['./signup-profile.page.scss'],
})
export class SignupProfilePage implements OnInit {

  constructor(private rs: RouterService) {}

  ngOnInit() {}

}