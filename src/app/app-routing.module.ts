import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  //this app has customized route handing. dont use default path.
  //{ path: '', redirectTo: '/signup', pathMatch: 'full' },
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },

  {
    path: 'ethtest',
    loadChildren: './pages/ethtest/ethtest.module#EthtestPageModule'
  },
  {
    path: 'signin',
    loadChildren: './pages/signin/signin.module#SigninPageModule'
  },
  {
    path: 'signup',
    loadChildren: './pages/signup/signup.module#SignupPageModule'
  },
  {
    path: 'signup-profile',
    loadChildren: './pages/signup-profile/signup-profile.module#SignupProfilePageModule'
  },
  { path: 'home', loadChildren: './pages/home/home.module#HomePageModule' },
  {
    path: 'add-edn-list',
    loadChildren: './pages/add-edn/add-edn-list/add-edn-list.module#AddEdnListPageModule'
  },
  {
    path: 'add-edn-eth',
    loadChildren: './pages/add-edn/add-edn-eth/add-edn-eth.module#AddEdnEthPageModule'
  },
  {
    path: 'pin-code',
    loadChildren: './pages/pin-code/pin-code/pin-code.module#PinCodePageModule'
  },
  {
    path: 'backup-wallet',
    loadChildren: './pages/wallet-management/backup-wallet/backup-wallet.module#BackupWalletPageModule'
  },
  {
    path: 'import-wallet',
    loadChildren: './pages/wallet-management/restore-wallet/restore-wallet.module#RestoreWalletPageModule'
  },
  {
    path: 'backup-notice',
    loadChildren: './pages/wallet-management/backup-notice/backup-notice.module#BackupNoticePageModule'
  },
  {
    path: 'add-wallet',
    loadChildren: './pages/wallet-management/add-wallet/add-wallet.module#AddWalletPageModule'
  },
  {
    path: 'ew-qrcode',
    loadChildren: './pages/edn-wallet/ew-qrcode/ew-qrcode.module#EwQrcodePageModule'
  },
  {
    path: 'ew-sendto',
    loadChildren: './pages/edn-wallet/ew-sendto/ew-sendto.module#EwSendtoPageModule'
  },
  {
    path: 'ew-tx-list',
    loadChildren: './pages/edn-wallet/ew-tx-list/ew-tx-list.module#EwTxListPageModule'
  },
  {
    path: 'tedn-deposit',
    loadChildren: './pages/tedn-wallet/tw-trade/tw-trade.module#TwTradePageModule'
  },
  {
    path: 'tedn-withdraw',
    loadChildren: './pages/tedn-wallet/tw-trade/tw-trade.module#TwTradePageModule'
  },
  {
    path: 'tw-tx-list',
    loadChildren: './pages/tedn-wallet/tw-tx-list/tw-tx-list.module#TwTxListPageModule'
  },
  {
    path: 'ednapitest',
    loadChildren: './pages/apitest/apitest.module#ApitestPageModule'
  },
  {
    path: 'redirector/:redirect',
    loadChildren: './pages/redirector/redirector.module#RedirectorPageModule'
  },
  {
    path: 'landing',
    loadChildren: './pages/landing/landing.module#LandingPageModule'
  },
  {
    path: 'terms-and-condition',
    loadChildren: './pages/signup-profile/terms-and-condition/terms-and-condition.module#TermsAndConditionPageModule'
  },
  {
    path: 'privacy-policy',
    loadChildren: './pages/signup-profile/privacy-policy/privacy-policy.module#PrivacyPolicyPageModule'
  }
];

// log a routing state
const traceRouting = false;

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      enableTracing: traceRouting,
      onSameUrlNavigation: 'reload'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
