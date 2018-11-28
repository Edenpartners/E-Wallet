import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output
} from '@angular/core';
import { EthService, EthProviders } from '../../providers/ether.service';
import { ethers } from 'ethers';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'ngx-clipboard';
import { EtherDataService } from '../../providers/etherData.service';
import { env } from '../../../environments/environment';

@Component({
  selector: 'eth-provider-maker',
  template: `
    <ion-grid class="bordered-grid">
      <ion-row>
        <ion-col align-self-center size="auto" class="no-border"
          >Network Provider :
        </ion-col>
        <ion-col size="auto" class="no-border">
          <ion-select
            [(ngModel)]="selectedWalletProviderType"
            (ionChange)="onWalletProviderTypeChange()"
          >
            <ion-select-option *ngFor="let pType of supportedProviderTypes">{{
              pType
            }}</ion-select-option>
          </ion-select>
        </ion-col>
        <ion-col size="auto" class="no-border">
          <ion-select
            [(ngModel)]="selectedWalletConnectionInfo"
            *ngIf="selectedWalletProviderType === 'KnownNetwork'"
          >
            <ion-select-option *ngFor="let pType of supportedKnownNetworks">{{
              pType
            }}</ion-select-option>
          </ion-select>

          <ion-input
            [(ngModel)]="selectedWalletConnectionInfo"
            placeholder="Connection Info"
            *ngIf="selectedWalletProviderType === 'JsonRpc'"
          ></ion-input>
        </ion-col>
      </ion-row>
    </ion-grid>
  `,
  styleUrls: ['./tester.scss']
})
export class EthProviderMaker implements OnInit, OnDestroy {
  supportedProviderTypes: Array<EthProviders.Type> = [
    EthProviders.Type.KnownNetwork,
    EthProviders.Type.JsonRpc
  ];
  supportedKnownNetworks: Array<EthProviders.KnownNetworkType> = [
    EthProviders.KnownNetworkType.homestead,
    EthProviders.KnownNetworkType.ropsten
  ];

  selectedWalletProviderType: EthProviders.Type =
    EthProviders.Type.KnownNetwork;
  //selectedWalletConnectionInfo: string =
  //EthProviders.KnownNetworkType.homestead;

  selectedWalletConnectionInfo: string = env.config.ednEthNetwork;

  constructor(
    public eths: EthService,
    private cbService: ClipboardService,
    private logger: NGXLogger,
    private etherData: EtherDataService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {}

  onWalletProviderTypeChange() {
    if (this.selectedWalletProviderType === EthProviders.Type.KnownNetwork) {
      this.selectedWalletConnectionInfo =
        EthProviders.KnownNetworkType.homestead;
    } else {
      this.selectedWalletConnectionInfo = '';
    }
  }
}
