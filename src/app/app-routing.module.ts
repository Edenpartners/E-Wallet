import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPageModule } from './pages/samples/tabs/tabs.module';
import { TabsPage } from './pages/samples/tabs/tabs.page';

const startPath = 'ew-main';

const routes: Routes = [
  { path: '', redirectTo: startPath, pathMatch: 'full' },
  { path: 'me', loadChildren: './pages/samples/tabs/tabs.module#TabsPageModule' },
  { path: 'ethtest', loadChildren: './pages/ethtest/ethtest.module#EthtestPageModule' },
  { path: 'signin', loadChildren: './pages/signin/signin.module#SigninPageModule' },
  { path: 'signup', loadChildren: './pages/signup/signup.module#SignupPageModule' },
  { path: 'signup-profile', loadChildren: './pages/signup-profile/signup-profile.module#SignupProfilePageModule' },
  { path: 'home', loadChildren: './pages/home/home.module#HomePageModule' },
  { path: 'dp-edn-list', loadChildren: './pages/edn-deposit/dp-edn-list/dp-edn-list.module#DpEdnListPageModule' },
  { path: 'dp-edn-main', loadChildren: './pages/edn-deposit/dp-edn-main/dp-edn-main.module#DpEdnMainPageModule' },
  { path: 'pc-edit', loadChildren: './pages/pin-code/pc-edit/pc-edit.module#PcEditPageModule' },
  { path: 'pc-confirm', loadChildren: './pages/pin-code/pc-confirm/pc-confirm.module#PcConfirmPageModule' },
  { path: 'backup-wallet', loadChildren: './pages/backup_n_restore/backup-wallet/backup-wallet.module#BackupWalletPageModule' },
  { path: 'restore-wallet', loadChildren: './pages/backup_n_restore/restore-wallet/restore-wallet.module#RestoreWalletPageModule' },
  { path: 'backup-notice', loadChildren: './pages/backup_n_restore/backup-notice/backup-notice.module#BackupNoticePageModule' },
  { path: 'ew-qrcode', loadChildren: './pages/edn-wallet/ew-qrcode/ew-qrcode.module#EwQrcodePageModule' },
  { path: 'ew-sendto', loadChildren: './pages/edn-wallet/ew-sendto/ew-sendto.module#EwSendtoPageModule' },
  { path: 'ew-tx-list', loadChildren: './pages/edn-wallet/ew-tx-list/ew-tx-list.module#EwTxListPageModule' },
  { path: 'ew-main', loadChildren: './pages/edn-wallet/ew-main/ew-main.module#EwMainPageModule' }
];

// log a routing state
const traceRouting = false;

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: traceRouting })],
  exports: [RouterModule]
})
export class AppRoutingModule {}