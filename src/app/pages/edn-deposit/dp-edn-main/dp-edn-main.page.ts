import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterService } from '../../../providers/router.service';

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
import { env } from '../../../../environments/environment';

import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-dp-edn-main',
  templateUrl: './dp-edn-main.page.html',
  styleUrls: ['./dp-edn-main.page.scss']
})
export class DpEdnMainPage implements OnInit, OnDestroy {
  selectedTrader = 'Kyber Networks';
  selectedWalletId: string = null;
  wallets: Array<WalletTypes.EthWalletInfo> = [];
  ednFromEthEstimatedText = '-';
  ednFromEthEstimated: BigNumber;
  ethAmount = '0';

  constructor(
    private rs: RouterService,
    public cfg: ConfigService,
    public eths: EthService,
    private cbService: ClipboardService,
    private store: LocalStorageService,
    private logger: NGXLogger,
    private etherData: EtherDataService,
    private walletService: WalletService,
    private kyberNetworkService: KyberNetworkService,
    private etherApi: EtherApiService,
    private ednApi: EdnRemoteApiService,
    private storage: AppStorageService,
    private dataTracker: DataTrackerService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.wallets = this.storage.getWallets(false, false);
    if (this.wallets.length > 0) {
      this.selectedWalletId = this.wallets[0].id;
    }
    this.restartRateTracker();
  }

  ngOnDestroy() {
    this.dataTracker.stopTracker('ednRateTracker');
  }

  restartRateTracker() {
    this.dataTracker.stopTracker('ednRateTracker');
    this.dataTracker.startTracker('ednRateTracker', () => {
      return new Promise<any>((finalResolve, finalReject) => {
        this.getRate(rate => {
          finalResolve(rate);
        });
      });
    });
  }

  onWalletChange(field) {
    this.logger.debug(field);
  }

  getRate(onValueCatch = value => {}) {
    if (!this.selectedWalletId) {
      this.logger.debug('select an wallet first');
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    const ethAmountBn = ethers.utils.parseEther('1');
    this.logger.debug('eth amount : ' + ethAmountBn.toString());

    this.etherApi
      .kyberNetworkGetExpectedTradeRateWithWallet(
        walletInfo,
        this.etherData.contractResolver.getETH(p),
        ednContractInfo.address,
        ethAmountBn
      )
      .then(
        result => {
          onValueCatch(result);
          this.displayRate(result);
        },
        err => {
          this.logger.debug(err);
        }
      );
  }

  getRateByLocally() {
    if (this.dataTracker.getTracker('ednRateTracker').value) {
      this.displayRate(this.dataTracker.getTracker('ednRateTracker').value);
    }
  }

  displayRate(rate) {
    if (rate.expectedRate !== undefined) {
      const ethAmountBn = ethers.utils.parseEther(String(this.ethAmount));

      // wei => rated wei ( calulcated by source value ( wei ))
      this.ednFromEthEstimated = ethers.utils.bigNumberify(rate.expectedRate);

      const rateResult = ethAmountBn.mul(this.ednFromEthEstimated);
      //convert
      const rateDivResult = rateResult.div(
        ethers.utils.bigNumberify(10).pow(18)
      );

      this.logger.debug(rateResult.toString());
      this.ednFromEthEstimatedText = ethers.utils.formatEther(rateDivResult);
    }
  }

  tradeEthToEdn() {
    if (!this.selectedWalletId) {
      alert('select an wallet first');
      return;
    }

    const walletInfo = this.storage.findWalletById(this.selectedWalletId);
    const p: EthProviders.Base = this.eths.getProvider(
      walletInfo.info.provider
    );
    const ednContractInfo = this.etherData.contractResolver.getERC20ContractInfo(
      env.config.ednCoinKey,
      p
    );

    const onTxCreate = txData => {
      this.logger.debug('on tx create');
      this.showToast('transaction created');
    };
    const onTxReceipt = txReceiptData => {
      this.logger.debug('on tx receipt');
      this.showToast('transaction receipted');
    };

    const onSuccess = data => {
      console.log(data);
      this.showToast('trade succeed!');
    };

    const onError = error => {
      alert(error);
    };

    const ethAmountBn = ethers.utils.parseEther(String(this.ethAmount));

    this.etherApi
      .kyberNetworkTradeEthToErc20Token(
        walletInfo,
        ednContractInfo.address,
        ethAmountBn,
        onTxCreate,
        onTxReceipt
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
