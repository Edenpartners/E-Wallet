import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private num: number;
  constructor() {
    this.num = 0;
  }

  say() {
    return 'say';
  }

  addNum() {
    this.num += 1;
    return this.num;
  }

}
