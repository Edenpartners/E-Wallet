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
import { IonComponentUtils } from '../utils/ion-component-utils';
import { Keyboard } from '@ionic-native/keyboard/ngx';

// https://beta.ionicframework.com/docs/api/nav-pop/
// https://beta.ionicframework.com/docs/api/nav-push/
// https://beta.ionicframework.com/docs/api/nav/
// https://beta.ionicframework.com/docs/api/modal/
// https://beta.ionicframework.com/docs/api/modal-controller/

class HistoryData {
  url: string;
  commands: Array<string>;
  extras: NavigationExtras;

  customBackButtonHandler: () => boolean = null;

  constructor(
    data: string | Array<string>,
    extras?: NavigationExtras,
    public isRoot: boolean = false
  ) {
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

  isContainsUrl(val: string): boolean {
    if (this.hasUrl) {
      if (this.url.indexOf(val) >= 0) {
        return true;
      }
    } else if (this.commands) {
      for (let i = this.commands.length - 1; i >= 0; i--) {
        const command = this.commands[i];
        if (command.indexOf(val) >= 0) {
          return true;
        }
      }
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
    private logger: NGXLogger,
    private keyboard: Keyboard
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

  getCurrentHistoryData(): HistoryData {
    if (this.histories.length < 1) {
      return null;
    }

    const lastIndex = this.histories.length - 1;
    return this.histories[lastIndex];
  }

  searchHistoryData(urlToSearch: string, searchFromBack: Boolean): HistoryData {
    this.logger.debug(
      'search history data for : ' +
        urlToSearch +
        ', history count : ' +
        this.histories.length
    );
    if (searchFromBack) {
      this.logger.debug('search from back');
      for (let i = this.histories.length - 1; i >= 0; i--) {
        const data = this.histories[i];
        this.logger.debug('checking : ' + data.url);
        if (data.isContainsUrl(urlToSearch)) {
          this.logger.debug('found');
          return data;
        }
      }
    } else {
      for (let i = 0; i < this.histories.length; i++) {
        const data = this.histories[i];
        if (data.isContainsUrl(urlToSearch)) {
          return data;
        }
      }
    }

    return null;
  }

  addCustomBackHandler(urlToSearch: string, customHandler: () => boolean) {
    const data: HistoryData = this.searchHistoryData(urlToSearch, true);
    if (data) {
      this.logger.debug('add custom back handler for : ' + data.url);
      data.customBackButtonHandler = customHandler;
    }
  }

  goBack() {
    if (!this.canGoBack()) {
      return;
    }

    this.keyboard.hide();
    IonComponentUtils.blurActiveElement();

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
  }

  clearHistory() {
    this.histories = [];
  }

  historyCount() {
    return this.histories.length;
  }

  navigateToRoot(url: string, animated: boolean = false) {
    this.clearHistory();

    const extras: NavigationOptions = {
      animated: animated,
      animationDirection: 'back'
    };

    this.histories.push(new HistoryData(url, extras, true));

    this.navCtl.navigateRoot(url, extras);
  }

  isCurrentUrlHasCustomHandler(): boolean {
    const currentHistory = this.getCurrentHistoryData();
    if (currentHistory && currentHistory.customBackButtonHandler) {
      this.logger.debug('current url has custom handler');
      return true;
    }
    this.logger.debug('current url has no custom handler');
    return false;
  }

  isCurrentUrlIsRoot(): boolean {
    const currentHistory = this.getCurrentHistoryData();
    if (currentHistory && currentHistory.isRoot) {
      return true;
    }

    return false;
  }

  isCurrentUrlStartsWith(url: string): boolean {
    const currentHistory = this.getCurrentHistoryData();
    if (currentHistory) {
      if (currentHistory.hasUrl) {
        return currentHistory.url.startsWith(url);
      } else {
        if (currentHistory.commands.length > 0) {
          return currentHistory.commands[0].startsWith(url);
        }
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
