import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';
import { ActivatedRoute } from '@angular/router';

import { EthService, EthProviders } from '../../../providers/ether.service';
import { ethers, Wallet, Contract } from 'ethers';
import { ConfigService } from '../../../providers/config.service';
import { NGXLogger } from 'ngx-logger';
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
import { EtherDataService } from '../../../providers/etherData.service';
import { WalletService, WalletTypes } from '../../../providers/wallet.service';
import { Input } from '@ionic/angular';
import { KyberNetworkService } from '../../../providers/kybernetwork.service';
import { EtherApiService } from '../../../providers/etherApi.service';
import { EdnRemoteApiService } from '../../../providers/ednRemoteApi.service';
import {
  AppStorageTypes,
  AppStorageService
} from '../../../providers/appStorage.service';

import {
  DataTrackerService,
  ValueTracker
} from '../../../providers/dataTracker.service';

import { SubscriptionPack } from '../../../utils/listutil';
import { DecimalPipe } from '@angular/common';
import { env } from '../../../../environments/environment';

import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-ew-sendto',
  templateUrl: './ew-sendto.page.html',
  styleUrls: ['./ew-sendto.page.scss']
})
export class EwSendtoPage implements OnInit, OnDestroy {
  private subscriptionPack: SubscriptionPack = new SubscriptionPack();

  walletId: string;
  wallet: WalletTypes.EthWalletInfo;

  constructor(
    private aRoute: ActivatedRoute,
    private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.subscriptionPack.addSubscription(() => {
      return this.aRoute.parent.params.subscribe(params => {
        this.walletId = params['id'];
        this.wallet = this.storage.findWalletById(this.walletId);
      });
    });
  }

  ngOnDestroy() {
    this.subscriptionPack.clear();
  }

  setEvents() {}

  transferERC20Token(toAddressInput: Input, sendingAmountInput: Input) {
    const toAddress = toAddressInput.value;
    const amount = sendingAmountInput.value;

    if (!toAddress) {
      alert('address required!');
      return;
    }
    if (!amount) {
      alert('amount required!');
      return;
    }
    let amountNum: number = null;
    try {
      amountNum = parseFloat(amount);
    } catch (e) {
      this.logger.debug(e);
    }
    if (!amountNum) {
      alert('amount required!');
      return;
    }

    const p: EthProviders.Base = this.eths.getProvider(
      this.wallet.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );
    const ednTracker = this.dataTracker.startERC20ContractBalanceTracking(
      this.wallet,
      ednContractInfo
    );

    if (ednTracker.value) {
      const ednBalance = ednTracker.value.balance;
      const ednAdjustedBalance = ednTracker.value.adjustedBalance;
    }

    const onTransactionCreate = tx => {
      /** transaction info */
      this.showToast('transaction created');
      this.storage.addTx(
        this.wallet,
        AppStorageTypes.TxType.EthERC20Transfer,
        AppStorageTypes.TxSubType.Send,
        tx.hash,
        AppStorageTypes.TxState.Created,
        new Date(),
        { from: this.wallet.address, to: toAddress, amount: amount },
        null
      );
    };

    const onTransactionReceipt = txReceipt => {
      this.showToast('transaction receipted');
      this.storage.addTxLog(
        this.wallet,
        txReceipt.transactionHash,
        AppStorageTypes.TxState.Receipted,
        new Date(),
        null
      );
    };

    const onSuccess = data => {
      this.showToast('sending succeed!');
    };
    const onError = error => {
      this.logger.debug('event : transfer failed!');
      alert(error);
    };

    this.etherApi
      .transferERC20Token(
        this.wallet,
        ednContractInfo,
        toAddress,
        amount,
        -1,
        onTransactionCreate,
        onTransactionReceipt
      )
      .then(onSuccess, onError);
  }

  async showToast(msg) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000
    });
    toast.present();
  }
}
