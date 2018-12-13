import { RouterService } from '../providers/router.service';

import { EthService, EthProviders } from '../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
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
import { EtherDataService } from '../providers/etherData.service';
import { WalletService, WalletTypes } from '../providers/wallet.service';
import { KyberNetworkService } from '../providers/kybernetwork.service';
import { EtherApiService } from '../providers/etherApi.service';
import { EdnRemoteApiService } from '../providers/ednRemoteApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../providers/appStorage.service';

import {
  DataTrackerService,
  ValueTracker
} from '../providers/dataTracker.service';

import { SubscriptionPack } from '../utils/listutil';
import { NGXLogger } from 'ngx-logger';

import { env } from '../../environments/environment';
import { FeedbackUIService } from '../providers/feedbackUI.service';
import { TranslateService } from '@ngx-translate/core';

import { Consts } from '../../environments/constants';

// constructor(
//   private aRoute: ActivatedRoute,
//   private rs: RouterService,
//   public eths: EthService,
//   private cbService: ClipboardService,
//   private store: LocalStorageService,
//   private logger: NGXLogger,
//   private etherData: EtherDataService,
//   private walletService: WalletService,
//   private etherApi: EtherApiService,
//   private ednApi: EdnRemoteApiService,
//   private storage: AppStorageService,
//   private dataTracker: DataTrackerService,
//   private events: Events
//   private feedbackUI: FeedbackUIService,
//   private translate: TranslateService
// )
