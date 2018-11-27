import { Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

// https://beta.ionicframework.com/docs/api/nav-pop/
// https://beta.ionicframework.com/docs/api/nav-push/
// https://beta.ionicframework.com/docs/api/nav/
// https://beta.ionicframework.com/docs/api/modal/
// https://beta.ionicframework.com/docs/api/modal-controller/

@Injectable({
  providedIn: 'root'
})
export class RouterService {
  constructor(
    private navCtl: NavController,
    private loc: Location,
    private router: Router,
    private actRoute: ActivatedRoute
  ) {}

  goBack() {
    this.navCtl.goBack(true);
  }

  getCurrentUrl() {
    return this.actRoute.url;
  }

  goTo(url: string) {
    //this.navCtl.navigateForward(url);
    this.router.navigateByUrl(url);
  }
}
