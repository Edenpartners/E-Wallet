import { RouterService } from './router.service';

import { EthService, EthProviders } from './ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from './config.service';
import { ClipboardService, ClipboardModule } from 'ngx-clipboard';
import {
  getJsonWalletAddress,
  BigNumber,
  AbiCoder,
  Transaction
} from 'ethers/utils';
import { LocalStorage, LocalStorageService } from 'ngx-store';
import { UUID } from 'angular2-uuid';
import { Observable, interval, Subscription } from 'rxjs';
import { EtherDataService } from './etherData.service';
import { WalletService, WalletTypes } from './wallet.service';
import { KyberNetworkService } from './kybernetwork.service';
import { EtherApiService } from './etherApi.service';
import { EdnRemoteApiService } from './ednRemoteApi.service';
import { AppStorageTypes, AppStorageService } from './appStorage.service';

import { DataTrackerService, ValueTracker } from './dataTracker.service';

import { SubscriptionPack } from '../utils/listutil';
import { NGXLogger } from 'ngx-logger';