import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Platform } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpResponse, HttpRequest } from '@angular/common/http';
import { HTTP, HTTPResponse } from '@ionic-native/http/ngx';
import { environment as env } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpHelperService {
  constructor(private logger: NGXLogger, private platform: Platform, private cordovaHttp: HTTP, private angularHttp: HttpClient) {}

  createJsonPostRequst(url: string, body: any, log: boolean = false): Promise<any> {
    return new Promise((finalResolve, finalReject) => {
      const contentTypeKey = 'Content-Type';
      const contentTypeVal = 'application/json';

      if (this.platform.is('cordova')) {
        this.logger.debug('run with cordova http');
        const headers = {};
        headers[contentTypeKey] = contentTypeVal;

        if (log) {
          this.logger.debug('send edn api : ' + url);
          this.logger.debug(body);
        }

        this.cordovaHttp.setDataSerializer('json');
        const promise: Promise<HTTPResponse> = this.cordovaHttp.post(url, body, headers);

        promise.then(
          response => {
            if (log) {
              this.logger.debug(response);
            }

            if (String(response.status).startsWith('2') && response.data) {
              let responseData = null;
              try {
                responseData = JSON.parse(response.data);
              } catch (error) {
                this.logger.debug(error);
              }

              if (responseData) {
                finalResolve(responseData);
              } else {
                finalReject(new Error('response data does not exists'));
              }
            } else {
              finalReject(new Error('http error with ' + response.status));
            }
          },
          error => {
            if (log) {
              this.logger.debug('http response error');
            }
            finalReject(error);
          }
        );
      } else {
        if (log) {
          this.logger.debug('run with angular http');
          this.logger.debug(body);
        }

        const headers = new HttpHeaders();
        headers.set(contentTypeKey, contentTypeVal);

        const promise: Promise<Object> = this.angularHttp
          .post(url, body, {
            headers: headers,
            responseType: 'json'
          })
          .toPromise();

        promise.then(
          response => {
            if (log) {
              this.logger.debug(response);
            }

            finalResolve(response);
          },
          error => {
            if (log) {
              this.logger.debug(error);
            }
            finalReject(error);
          }
        );
      }
    });
  }
}
