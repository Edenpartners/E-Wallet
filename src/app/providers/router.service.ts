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
import { NGXLogger } from 'ngx-logger';
import { NavigationOptions } from '@ionic/angular/dist/providers/nav-controller';

// https://beta.ionicframework.com/docs/api/nav-pop/
// https://beta.ionicframework.com/docs/api/nav-push/
// https://beta.ionicframework.com/docs/api/nav/
// https://beta.ionicframework.com/docs/api/modal/
// https://beta.ionicframework.com/docs/api/modal-controller/

class HistoryData {
  url: string;
  commands: Array<string>;
  extras: NavigationExtras;

  constructor(data: string | Array<string>, extras?: NavigationExtras) {
    if (typeof data === 'string') {
      this.url = data;
    } else if (data instanceof Array) {
      this.commands = data;
    }

    if (extras) {
      this.extras = extras;
    }
  }

  get hasUrl(): boolean {
    if (this.url) {
      return true;
    }
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RouterService {
  private histories: Array<HistoryData> = [];

  constructor(
    private navCtl: NavController,
    private loc: Location,
    private router: Router,
    private actRoute: ActivatedRoute,
    private logger: NGXLogger
  ) {}

  getRouter(): Router {
    return this.router;
  }

  canGoBack(): boolean {
    if (this.histories.length < 2) {
      this.logger.info('cannot go back : ' + this.histories.length);
      return false;
    }

    this.logger.info('can go back : ' + this.histories.length);
    return true;
  }

  goBack() {
    if (!this.canGoBack()) {
      return;
    }

    const lastIndex = this.histories.length - 1;
    const lastHistory = this.histories[lastIndex];

    const gotoIndex = this.histories.length - 2;
    const gotoHistory = this.histories[gotoIndex];

    this.histories.splice(lastIndex, 1);

    let naviOptions: any = gotoHistory.extras;
    if (naviOptions) {
      naviOptions.animated = true;
      naviOptions.animationDirection = 'back';
    } else {
      naviOptions = {
        animated: true,
        animationDirection: 'back'
      };
    }

    if (gotoHistory.hasUrl) {
      this.logger.info('goback to : ' + gotoHistory.url);
      this.navCtl.navigateBack(gotoHistory.url, naviOptions);
    } else {
      this.logger.info('goback to : ' + gotoHistory.commands);
      this.navCtl.navigateBack(gotoHistory.commands, naviOptions);
    }

    // this.navCtl.goBack({
    //   animated: true,
    //   animationDirection: 'back'
    // });
  }

  clearHistory() {
    this.histories = [];
  }

  navigateToRoot(url: string, animated: boolean = false) {
    this.clearHistory();

    const extras: NavigationOptions = {
      animated: animated,
      animationDirection: 'back'
    };

    this.histories.push(new HistoryData(url, extras));

    this.navCtl.navigateRoot(url, extras);
  }

  isCurrentUrlStartsWith(url: string): boolean {
    if (this.histories.length < 1) {
      return false;
    }

    const lastIndex = this.histories.length - 1;
    const lastHistory = this.histories[lastIndex];

    if (lastHistory.hasUrl) {
      return lastHistory.url.startsWith(url);
    } else {
      if (lastHistory.commands.length > 0) {
        return lastHistory.commands[0].startsWith(url);
      }
    }

    return false;
  }

  navigateByUrl(
    url: string,
    addToHistory: boolean = true,
    extras?: NavigationExtras
  ) {
    this.logger.info(
      'navigation by url : ' + url + ', addToHistory : ' + addToHistory
    );
    if (addToHistory) {
      this.histories.push(new HistoryData(url, extras));
    }
    this.router.navigateByUrl(url, extras);
  }

  navigate(
    commands: Array<string>,
    addToHistory: boolean = true,
    extras?: NavigationExtras
  ) {
    this.logger.info(
      'navigation by commands : ' +
        commands +
        ', addToHistory : ' +
        addToHistory
    );

    if (addToHistory) {
      this.histories.push(new HistoryData(commands, extras));
    }

    this.router.navigate(commands, extras);
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
