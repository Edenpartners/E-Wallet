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

export class EthProvider {
    idx: number;
    protected provider: Provider = null;

    constructor() {
        indexNum += 1;
        this.idx = indexNum;
    }

    public get describe(): string {
        return '';
    }

    public get type(): string {
        return typeof this;
    }

    public getProvider(): Provider {
        return null;
    }

    public hasProvider(): boolean {
        return this.provider !== null;
    }

    public isEqual(otherProvider: EthProvider): boolean {
        if (typeof otherProvider === typeof this && otherProvider.idx === this.idx) {
            return true;
        }
    }

    public connect() {

    }
}

export namespace EthProviders {
    export class DefaultProvider extends EthProvider {

        public get describe(): string {
            return this.network;
        }

        public get type(): string {
            return 'Default';
        }

        constructor(readonly network: string = 'homestead') {
            super();
        }

        public getProvider(): Provider {
            return this.provider;
        }

        public connect() {
            if (!this.provider) {
                this.provider = ethers.getDefaultProvider(this.network);
            }
        }

        public disconnect() {
            this.provider = null;
        }
    }

    export class EthJsonProvider extends EthProvider {
        constructor(readonly address: string = 'http://localhost:8545') {
            super();
        }

        public get describe(): string {
            return this.address;
        }

        public get type(): string {
            return 'JsonProvider';
        }

        public getProvider(): Provider {
            return this.provider;
        }

        public connect() {
            if (!this.provider) {
                this.provider = new ethers.providers.JsonRpcProvider(this.address);
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
    providers: Array<EthProvider> = [];
    _currentProvider: EthProvider;

    constructor(private logger: NGXLogger) {
        commonLogger = logger;
        commonLogger.info('web3 service creation');

        this.providers = [
            new EthProviders.DefaultProvider('ropsten'),
            new EthProviders.EthJsonProvider('http://localhost:7545')
        ];
    }

    get currentProvider(): EthProvider {
        return this._currentProvider;
    }

    setCurrentProvider(provider: EthProvider) {
        this._currentProvider = provider;
    }

    isCurrentProvider(provider: EthProvider): boolean {
        if (!this.currentProvider) { return false; }

        return this.currentProvider.isEqual(provider);
    }

    get versionInfo() {
        return ethers.version;
    }
}
