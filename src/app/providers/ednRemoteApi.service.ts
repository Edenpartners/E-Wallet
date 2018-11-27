import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ApitestPage } from '../pages/apitest/apitest.page';

import { Component, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/providers/firebase.service';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase';
import { Platform } from '@ionic/angular';
import { UUID } from 'angular2-uuid';
import { environment as env } from '../../environments/environment';
import {
  HttpClient,
  HttpHeaders,
  HttpResponse,
  HttpRequest
} from '@angular/common/http';
import { HTTP, HTTPResponse } from '@ionic-native/http/ngx';

import { TwitterConnect } from '@ionic-native/twitter-connect/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Facebook } from '@ionic-native/facebook/ngx';

import { AppStorageService, AppStorageTypes } from './appStorage.service';

// {
//   "id": "a6d52821-734d-443f-11b8-b41c7f258c04",
//   "jsonrpc": "2.0",
//   "result": {
//     "data": {},
//     "err_code": -1,
//     "msg": "deposit error"
//   }
// }
export interface JsonRpcBody {
  id: string;
  jsonrpc: string;
  method: string;
  params: any;
}

export class JsonRpcResultError extends Error {
  constructor(message: string, public body: JsonRpcBody) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

@Injectable({
  providedIn: 'root'
})
export class EdnRemoteApiService {
  constructor(
    private logger: NGXLogger,
    private platform: Platform,
    private afAuth: AngularFireAuth,
    private twAuth: TwitterConnect,
    private ggAuth: GooglePlus,
    private fbAuth: Facebook,
    private cordovaHttp: HTTP,
    private angularHttp: HttpClient,
    private storage: AppStorageService
  ) {}

  get baseUrl() {
    if (this.platform.is('cordova')) {
      return 'https://edencore-end-point-dot-manifest-ivy-213501.appspot.com/api';
    } else if (this.platform.is('desktop')) {
      const location = window.location;
      if (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
      ) {
        const result = location.protocol + '//' + location.host + '/api';
        return result;
      } else {
        return 'https://edencore-end-point-dot-manifest-ivy-213501.appspot.com/api';
      }
    } else {
      return 'https://edencore-end-point-dot-manifest-ivy-213501.appspot.com/api';
    }
  }

  registerFirebaseUser(userId: string, userPasswd: string): Promise<any> {
    return new Promise((finalResolve, finalRejct) => {
      if (userId.length < 1) {
        finalRejct({});
        return;
      }
      if (userPasswd.length < 1) {
        finalRejct({});
        return;
      }

      this.afAuth.auth.createUserWithEmailAndPassword(userId, userPasswd).then(
        user => {
          this.logger.debug('registered : ' + typeof user);
          this.logger.debug(user);
          const userInfo = user.user;

          this.afAuth.auth.currentUser.getIdToken().then(
            idToken => {
              this.logger.debug('uid : ' + this.afAuth.auth.currentUser.uid);
              this.logger.debug('idToken : ' + idToken);

              finalResolve(this.afAuth.auth.currentUser);
            },
            err => {
              this.logger.debug(err);
              finalRejct(err);
            }
          );
        },
        error => {
          this.logger.debug('registering error');
          this.logger.debug(error);
          finalRejct(error);
        }
      );
    });
  }

  signinFirebaseUser(userEmail: string, userPasswd: string): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      if (userEmail.length < 1) {
        finalReject(new Error('User ID does not exists'));
        return;
      }
      if (userPasswd.length < 1) {
        finalReject(new Error('User password does not exists'));
        return;
      }

      this.afAuth.auth.signInWithEmailAndPassword(userEmail, userPasswd).then(
        res => {
          finalResolve(res);
          this.logger.debug(res);
        },
        err => {
          this.logger.debug(err);
          finalReject(err);
        }
      );
    });
  }

  signinFirebaseUserWithGoogle() {
    return new Promise((finalResolve, finalReject) => {
      if (this.platform.is('mobile') && this.platform.is('cordova')) {
        this.logger.debug('start google login');
        this.ggAuth
          .login({
            offline: true,
            scopes: 'profile email'
          })
          .then(
            ggUser => {
              this.logger.debug('google login result');
              this.logger.debug(ggUser);

              let ggAccessToken = null;
              let ggIdToken = null;

              if (ggUser.accessToken) {
                ggAccessToken = ggUser.accessToken;
              }
              if (ggUser.idToken) {
                ggIdToken = ggUser.idToken;
              }

              const ggCredential = firebase.auth.GoogleAuthProvider.credential(
                ggIdToken,
                ggAccessToken
              );

              this.afAuth.auth
                .signInAndRetrieveDataWithCredential(ggCredential)
                .then(
                  signinResult => {
                    this.logger.debug('google-firebase signin complete');
                    this.logger.debug(signinResult);

                    finalResolve(signinResult);
                  },
                  err => {
                    this.logger.debug('google-firebase signin error');
                    this.logger.debug(err);
                    finalReject(err);
                  }
                );
            },
            ggErr => {
              this.logger.debug('google login error');
              this.logger.debug(ggErr);
              if (ggErr === '12500') {
                this.logger.debug(
                  'android app sha-hash error ( firebase settings )'
                );
              }
              finalReject(ggErr);
            }
          );
      } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.afAuth.auth.signInWithPopup(provider).then(
          res => {
            this.logger.debug(res);
            finalResolve(res);
          },
          err => {
            this.logger.debug('google login error');
            this.logger.debug(err);
            finalReject(err);
          }
        );
      }
    });
  }

  async signinFirebaseUserWithFacebook() {
    return new Promise((finalResolve, finalReject) => {
      if (this.platform.is('mobile') && this.platform.is('cordova')) {
        this.logger.debug('start facebook login');

        //['email']
        this.fbAuth.login([]).then(
          fbResponse => {
            this.logger.debug('facebook login ok');
            this.logger.debug(fbResponse);

            const fbCredential = firebase.auth.FacebookAuthProvider.credential(
              fbResponse.authResponse.accessToken
            );
            this.afAuth.auth.signInWithCredential(fbCredential).then(
              signinResult => {
                this.logger.debug('facebook-firebase signin complete');
                this.logger.debug(signinResult);

                finalResolve(signinResult);
              },
              signinErr => {
                this.logger.debug('facebook-firebase signin error');
                this.logger.debug(signinErr);
                finalReject(signinErr);
              }
            );
          },
          fbErr => {
            this.logger.debug('facebook login error');
            this.logger.debug(fbErr);
            finalReject(fbErr);
          }
        );
      } else {
        const provider = new firebase.auth.FacebookAuthProvider();
        this.afAuth.auth.signInWithPopup(provider).then(
          res => {
            this.logger.debug(res);
            finalResolve(res);
          },
          err => {
            this.logger.debug(err);
            finalReject(err);
          }
        );
      }
    });
  }

  signinFirebaseUserWithTwitter(): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      if (this.platform.is('mobile') && this.platform.is('cordova')) {
        this.logger.debug('start twitter login');

        this.twAuth.login().then(
          twResponse => {
            this.logger.debug('twitter login ok');
            this.logger.debug(twResponse);

            // for ios testing
            // window.cordova.plugins['firebase'].auth
            //   .signinWithTwitter(twResponse.token, twResponse.secret)
            //   .then(
            //     signinResult => {
            //       this.logger.debug('twitter-firebase signin complete');
            //       this.logger.debug(signinResult);
            //     },
            //     signinErr => {
            //       this.logger.debug('twitter-firebase signin error');
            //       this.logger.debug(signinErr);
            //     }
            //   );

            const twCredential = firebase.auth.TwitterAuthProvider.credential(
              twResponse.token,
              twResponse.secret
            );

            // const provider = new firebase.auth.TwitterAuthProvider();
            // this.afAuth.auth.signInWithPopup(provider).then(

            this.afAuth.auth
              .signInAndRetrieveDataWithCredential(twCredential)
              .then(
                signinResult => {
                  this.logger.debug('twitter-firebase signin complete');
                  this.logger.debug(signinResult);
                  finalResolve(signinResult);
                },
                signinErr => {
                  this.logger.debug('twitter-firebase signin error');
                  this.logger.debug(signinErr);
                  finalReject(signinErr);
                }
              );
          },
          twErr => {
            this.logger.debug('twitter login error');
            this.logger.debug(twErr);
            finalReject(twErr);
          }
        );
      } else {
        const provider = new firebase.auth.TwitterAuthProvider();
        this.afAuth.auth.signInWithPopup(provider).then(
          res => {
            this.logger.debug(res);
            finalResolve(res);
          },
          err => {
            this.logger.debug(err);
            finalReject(err);
          }
        );
      }
    });
  }

  signoutFirebase(): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      this.afAuth.auth.signOut().then(
        () => {
          finalResolve();
        },
        error => {
          finalReject();
        }
      );
    });
  }

  fetchFirebaseSigninInfo(userId: string): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      this.afAuth.auth.fetchSignInMethodsForEmail(userId).then(
        (list: Array<string>) => {
          this.logger.debug('signin methods');
          list.forEach((item, index) => {
            this.logger.debug(item);
          });

          finalResolve(list);
        },
        err => {
          this.logger.debug(err);
          finalReject(err);
        }
      );
    });
  }

  getUserAccessToken(): Promise<string> {
    return new Promise((finalResolve, finalReject) => {
      if (!this.storage.user) {
        finalReject(new Error('not signed in'));
      } else {
        this.storage.user.fbUser.getIdToken().then(
          token => {
            finalResolve(token);
          },
          error => {
            finalReject(error);
          }
        );
      }
    });
  }

  createJsonBody(method: string, params: any = {}): Promise<JsonRpcBody> {
    return new Promise((finalResolve, finalReject) => {
      this.getUserAccessToken().then(
        token => {
          params.iamtoken = token;
          finalResolve({
            id: UUID.UUID(),
            jsonrpc: '2.0',
            method: method,
            params: params
          });
        },
        error => {
          finalReject(error);
        }
      );
    });
  }

  createPostRequst(body: JsonRpcBody): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      const contentTypeKey = 'Content-Type';
      const contentTypeVal = 'application/json';
      if (this.platform.is('cordova')) {
        this.logger.debug('run with cordova http');
        const headers = {};
        headers[contentTypeKey] = contentTypeVal;

        this.logger.debug('send edn api : ' + this.baseUrl);
        this.logger.debug(body);

        this.cordovaHttp.setDataSerializer('json');
        const promise: Promise<HTTPResponse> = this.cordovaHttp.post(
          this.baseUrl,
          body,
          headers
        );

        promise.then(
          response => {
            this.logger.debug(response);
            if (String(response.status).startsWith('2') && response.data) {
              let responseData = null;
              try {
                responseData = JSON.parse(response.data);
              } catch (error) {
                this.logger.debug(error);
              }

              if (responseData) {
                this.judgeEdnResponseResult(
                  responseData,
                  finalResolve,
                  finalReject
                );
              } else {
                finalReject(new Error('response data does not exists'));
              }
            } else {
              finalReject(new Error('http error with ' + response.status));
            }
          },
          error => {
            this.logger.debug('http response error');
            finalReject(error);
          }
        );
      } else {
        this.logger.debug('run with angular http');
        this.logger.debug(body);

        const headers = new HttpHeaders();
        headers.set(contentTypeKey, contentTypeVal);

        const promise: Promise<Object> = this.angularHttp
          .post(this.baseUrl, body, {
            headers: headers,
            responseType: 'json'
          })
          .toPromise();

        promise.then(
          response => {
            this.logger.debug(response);
            this.judgeEdnResponseResult(response, finalResolve, finalReject);
          },
          error => {
            this.logger.debug(error);
            finalReject(error);
          }
        );
      }
    });
  }

  // "id": "c461929a-9a5c-8e72-42f5-55fbdaa16669",
  // "jsonrpc": "2.0",
  // "result": {
  //   "data": "signin",
  //   "err_code": 0,
  //   "msg": ""
  // }
  judgeEdnResponseResult(
    response: any,
    resolve: (value?: {} | PromiseLike<{}>) => void,
    reject: (reason?: any) => void
  ) {
    const data = response;
    if (
      data &&
      data.id &&
      data.result &&
      data.result.err_code !== undefined &&
      data.result.err_code !== null
    ) {
      if (String(data.result.err_code).trim() === '0') {
        resolve(data.result);
      } else {
        let msg = data.result.err_code + ' / ' + data.result.msg;
        if (!msg) {
          msg = '';
        }
        const errObj = new JsonRpcResultError(msg, data);
        reject(errObj);
      }
    } else {
      reject(new Error('unknown response data'));
    }
  }

  private createBasicRequestPromise(
    command: string,
    params: any = {}
  ): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      this.createJsonBody(command, params).then(
        body => {
          this.createPostRequst(body).then(
            data => {
              finalResolve(data);
            },
            error => {
              finalReject(error);
            }
          );
        },
        bodyError => {
          finalReject(bodyError);
        }
      );
    });
  }

  signup(): Promise<any> {
    return this.createBasicRequestPromise('user.signup');
  }

  signin() {
    return this.createBasicRequestPromise('user.signin');
  }

  signout(): Promise<any> {
    return this.createBasicRequestPromise('user.signout');
  }

  getUserInfo(): Promise<any> {
    return this.createBasicRequestPromise('user.get_info');
  }

  updateUserInfo(userInfo: AppStorageTypes.UserInfo): Promise<any> {
    return this.createBasicRequestPromise('user.update_profile', {
      display_name: userInfo.display_name
    });
  }

  getTEDNBalance(): Promise<any> {
    return this.createBasicRequestPromise('user.getbalance');
  }

  addEthAddress(ethaddress: string): Promise<any> {
    return this.createBasicRequestPromise('eth.add_address', {
      address: ethaddress
    });
  }

  removeEthAddress(ethaddress: string): Promise<any> {
    return this.createBasicRequestPromise('eth.del_address', {
      address: ethaddress
    });
  }

  getCoinHDAddress() {
    return this.createBasicRequestPromise('server.coinhdaddress');
  }

  depositToTEDN(txhash: string) {
    return this.createBasicRequestPromise('user.deposit', { txhash: txhash });
  }

  withdrawFromTEDN(ethaddress: string, amount: string) {
    return this.createBasicRequestPromise('user.withdraw', {
      ethaddress: ethaddress,
      amount: amount
    });
  }

  getTEDNTransaction(pageNum, countPerPage) {
    return this.createBasicRequestPromise('user.lstransaction', {
      page: pageNum,
      countperpage: countPerPage
    });
  }
}
