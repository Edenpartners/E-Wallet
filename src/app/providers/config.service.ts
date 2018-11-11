import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  sharedPassphrase = '1234qwer';
  tempEncPassword = '1234qwer';

  constructor() {
  }
}
