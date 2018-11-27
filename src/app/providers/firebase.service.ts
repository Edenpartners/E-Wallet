import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Firebase } from '@ionic-native/firebase';
import { FirebaseAuthentication } from '@ionic-native/firebase-authentication';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor(private logger: NGXLogger) {}

  check() {
    // this.firebase
    //   .getToken()
    //   // save the token server-side and use it to push notifications to this device
    //   .then(token => this.logger.debug(`The token is ${token}`))
    //   .catch(error => this.logger.error('Error getting token', error));
    // this.firebase
    //   .onTokenRefresh()
    //   .subscribe((token: string) =>
    //     this.logger.debug(`Got a new token ${token}`)
    //   );
  }
}
