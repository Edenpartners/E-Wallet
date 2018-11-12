import { InjectionToken, Injectable, Inject, OnInit, OnDestroy } from '@angular/core';

// https://github.com/ethereum/wiki/wiki/JavaScript-API / for 0.2.x
// https://web3js.readthedocs.io/en/1.0/web3.html / for 1.0
import Web3 from 'web3';

// https://github.com/ethers-io/ethers.js/
import { Observable, bindNodeCallback, of, Subject, interval} from 'rxjs';
import { tap, map, catchError, timeInterval } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';

import { ethers } from 'ethers';
import { Provider } from 'ethers/providers';

let commonLogger: NGXLogger;

// https://medium.com/b2expand/create-a-decentralized-ethereum-application-with-angular-43cf02451fbe
// https://angular.io/guide/rx-library ( Interval & Subscribe)
// http://web-front-end.tistory.com/71

let indexNum = 0;

export namespace EthProviders {

    export function createInstanceFrom(info: Info) {
        if (info.type === Type.KnownNetwork) {
            return new EthProviders.KnownProvider(info);
        } else if(info.type === Type.JsonRpc) {
            return new EthProviders.JsonProvider(info);
        }
    }

    export enum KnownNetworkType {
        homestead = 'homestead',
        ropsten = 'ropsten'
    }

    export enum Type {
        KnownNetwork = 'KnownNetwork',
        JsonRpc = 'JsonRpc'
    }

    export interface Info {
        type: EthProviders.Type;
        connectionInfo: string;
    }

    export class Base {
        idx: number;
        protected info: EthProviders.Info;
        protected provider: Provider = null;

        constructor(info: EthProviders.Info) {
            indexNum += 1;
            this.idx = indexNum;
            this.info = info;
        }

        public getEthersJSProvider(): Provider {
            return null;
        }

        public hasEthersJSProvider(): boolean {
            return this.provider !== null;
        }

        public isEqual(otherProvider: EthProviders.Base): boolean {
            if (otherProvider.info.type === this.info.type && otherProvider.info.connectionInfo === this.info.connectionInfo) {
                return true;
            }
        }

        public isEqualInfo(info: EthProviders.Info): boolean {
            if (info.type === this.info.type && info.connectionInfo === this.info.connectionInfo) {
                return true;
            }
        }

        public connect() {
        }
    }

    export class KnownProvider extends EthProviders.Base {
        constructor(info: EthProviders.Info = { type: Type.KnownNetwork, connectionInfo: 'homestead' }) {
            super(info);
        }

        public getEthersJSProvider(): Provider {
            if (!this.provider) { this.connect(); }
            return this.provider;
        }

        public connect() {
            if (!this.provider) {
                this.provider = ethers.getDefaultProvider(this.info.connectionInfo);
            }
        }

        public disconnect() {
            this.provider = null;
        }
    }

    export class JsonProvider extends EthProviders.Base {
        constructor(info: EthProviders.Info = { type: Type.JsonRpc, connectionInfo: 'http://localhost:8545' }) {
            super(info);
        }

        public getEthersJSProvider(): Provider {
            if (!this.provider) { this.connect(); }
            return this.provider;
        }

        public connect() {
            if (!this.provider) {
                this.provider = new ethers.providers.JsonRpcProvider(this.info.connectionInfo);
            }
        }

        public disconnect() {
            this.provider = null;
        }
    }
}


@Injectable({
    providedIn: 'root'
})
export class EthService {
    providers: Array<EthProviders.Base> = [];

    constructor(private logger: NGXLogger) {
        commonLogger = logger;
        commonLogger.info('web3 service creation');

        this.providers = [];
    }

    getProvider(info: EthProviders.Info): EthProviders.Base {
        for (let i = 0; i < this.providers.length; i++) {
            const p = this.providers[i];
            if (p.isEqualInfo(info)) {
                return p;
            }
        }

        const result = EthProviders.createInstanceFrom(info);
        this.providers.push(result);
        return result;
    }

    get versionInfo() {
        return ethers.version;
    }
}
