import { Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  Router,
  ActivatedRoute,
  CanActivate,
  ActivatedRouteSnapshot,
  NavigationExtras
} from '@angular/router';
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

  getRouter(): Router {
    return this.router;
  }

  goBack() {
    this.navCtl.goBack(true);
  }

  getCurrentUrl() {
    return this.actRoute.url;
  }

  navigateByUrl(url: string, extras?: NavigationExtras) {
    //this.navCtl.navigateForward(url);
    this.router.navigateByUrl(url, extras);
    //this.router.navigateByUrl(url, {});
  }

  navigate(urls: Array<string>, extras?: NavigationExtras) {
    this.router.navigate(urls, extras);
  }
}

@Injectable()
export class ForwarderGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    this.router.navigate([
      `myroute/${route.params['id']}/${route.params['value']}`
    ]);
    return false;
  }
}
