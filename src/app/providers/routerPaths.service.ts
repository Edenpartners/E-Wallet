import { Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router, Route, UrlSegment } from '@angular/router';
import { Location } from '@angular/common';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class RouterPathsService {
  constructor(private logger: NGXLogger) {}

  paths: Array<string> = [];
  customPaths: Array<string> = [];
  showUrlTree(configs: Array<Route>) {
    if (!configs) {
      return;
    }

    configs.forEach(item => {
      this.paths.push(item.path);
      this.showUrlTree(item.children);
    });
  }

  addConfig(router: Router) {
    this.showUrlTree(router.config);
  }
}
