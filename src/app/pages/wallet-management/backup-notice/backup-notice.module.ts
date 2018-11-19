import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SharedPageModule } from '../../../modules/shared.page.module';

import { BackupNoticePage } from './backup-notice.page';

const routes: Routes = [{
  path: '',
  component: BackupNoticePage
}];

@NgModule({
  imports: [
    SharedPageModule,
    RouterModule.forChild(routes)
  ],
  declarations: [BackupNoticePage]
})
export class BackupNoticePageModule {}