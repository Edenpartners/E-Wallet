import { InjectionToken, Injectable, Inject, OnInit, OnDestroy } from '@angular/core';

// https://github.com/ethereum/wiki/wiki/JavaScript-API / for 0.2.x
// https://web3js.readthedocs.io/en/1.0/web3.html / for 1.0
import Web3 from 'web3';

// https://github.com/ethers-io/ethers.js/
import { ethers } from 'ethers';
import { Observable, bindNodeCallback, of, Subject, interval} from 'rxjs';
import { tap, map, catchError, timeInterval } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';

let commonLogger: NGXLogger;

// https://medium.com/b2expand/create-a-decentralized-ethereum-application-with-angular-43cf02451fbe
// https://angular.io/guide/rx-library ( Interval & Subscribe)
// http://web-front-end.tistory.com/71
export class EthProvider implements OnInit, OnDestroy {
    private providerObj: any;
    private _isConnected = false;
    private connectedSource$: Observable<number>;
    private connectedSubscribe;
    private isConnected$: Subject<boolean>;

    private isConnecting = false;
    private connectionTimer: any = null;

    autoConnect = false;
    autoReconnectOnDisconnected = false;
    isDisconnectedByUser = false;

    constructor(readonly address: string, readonly type: EthProvider.Type) {
        this.isConnected$ = new Subject<boolean>();

        commonLogger.info('start interval');
        this.connectedSource$ = interval(1000);

        this.connectedSubscribe = this.connectedSource$.subscribe(
            (val) => {
                const oldVal = this._isConnected;
                this._isConnected = this.isConnected;

                if (oldVal !== this._isConnected) {
                    commonLogger.info('value changed!');
                    this.isConnected$.next(this._isConnected);
                }
            },
            (err) => {

            },
            () => {
            }
        );

        if (this.autoConnect) {
            this.connect();
        }
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        commonLogger.trace('destroy');
        this.connectedSubscribe.unsubscribe();
    }

    isConnectedSubscriber(observer) {
        observer.next(true);

        return { unsubscribe() { clearTimeout() } };
    }

    private onDisconnect() {
        this.providerObj = null;

        if (this.autoReconnectOnDisconnected) {
            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
                this.connectionTimer = null;
            }

            this.connectionTimer = setTimeout(() => {
                commonLogger.debug('timeout');
                this.connect();
            }, 1000);
        }
    }

    connect() {
        if (this.isConnecting) {
            commonLogger.debug('connection working');
            return;
        }
        this.isConnecting = true;

        commonLogger.debug('trying to connect ... ' + this.address);

        try {
            if (this.type === EthProvider.Type.WebSocket) {
                this.providerObj = new Web3.providers.WebsocketProvider(this.address);
                this.providerObj.connection.addEventListener('open', (e) => {
                    this.isConnecting = false;
                });
                this.providerObj.connection.addEventListener('error', (e) => {
                    commonLogger.info('error');
                });
                this.providerObj.connection.addEventListener('close', (e) => {
                    commonLogger.info('closed');
                    this.isConnecting = false;

                    if (this.isDisconnectedByUser === false) {
                        this.onDisconnect();
                    } else {
                        this.isDisconnectedByUser = false;
                    }
                });
            } else if (this.type === EthProvider.Type.Http) {
                this.providerObj = new Web3.providers.HttpProvider(this.address);
            } else if (this.type === EthProvider.Type.IPC) {
                this.providerObj = new Web3.providers.IpcProvider(this.address);
            }
        } catch (e) {
            this.providerObj = null;
            commonLogger.debug('connection failed');
        }
    }

    disconnect() {
        if (this.isConnected) {
            this.isDisconnectedByUser = true;
            this.providerObj.disconnect();
            this.providerObj = null;
        }
    }

    get provider() {
        return this.providerObj;
    }

    get isConnected(): boolean {
        if (!this.providerObj) { return false; }
        return this.providerObj.connected;
    }

    get isConnectedOb(): Observable<boolean> {
        return this.isConnected$;
    }
}

export namespace EthProvider {
    export enum Type {
        Http = 'Http',
        WebSocket = 'WebSocket',
        IPC = 'IPC'
    }
}

@Injectable({
    providedIn: 'root'
})
export class EthService {
    private web3: Web3;
    providers: Array<EthProvider> = [];
    _currentProvider: EthProvider;

    constructor(private logger: NGXLogger) {
        commonLogger = logger;
        commonLogger.info('web3 service creation');

        this.web3 = new Web3();
        window['web3'] = this.web3;

        this.providers = [
            new EthProvider('ws://localhost:7545', EthProvider.Type.WebSocket),
            new EthProvider('ws://192.168.0.31:8545', EthProvider.Type.WebSocket)
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
        if (provider.address === this.currentProvider.address &&
            provider.type === this.currentProvider.type) {
            return true;
        }
        return false;
    }

    get versionInfo() {
        return this.web3.version;
    }

    get accounts(): Observable<string[]> {
        return bindNodeCallback(this.web3.eth.getAccounts)();
    }

    get currentAccount(): Observable<string | Error> {
        if (this.web3.eth.defaultAccount) {
            return of(this.web3.eth.defaultAccount);
        } else {
            return this.accounts.pipe(
                tap((accounts: string[]) => {
                    if (accounts.length === 0) { throw new Error('No accounts available'); }
                }),
                map((accounts: string[]) => accounts[0]),
                tap((account: string) => this.web3.defaultAccount = account),
                catchError((err: Error) => of(err))
            );
        }
    }
}
