import { Component, OnInit, HostBinding } from '@angular/core';
import { NavParams, Events } from '@ionic/angular';
import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from 'ngx-clipboard';
import { Consts } from 'src/environments/constants';
import { TranslateService } from '@ngx-translate/core';
import { FeedbackUIService } from 'src/app/providers/feedbackUI.service';

@Component({
  selector: 'app-content-popup',
  templateUrl: './content-popup.page.html',
  styleUrls: ['./content-popup.page.scss']
})
export class ContentPopupPage implements OnInit {
  @HostBinding('class.transparent-page') transparentClass = true;
  content = '';
  isCopyComplete = false;
  timeoutRunner: any = null;

  constructor(
    private logger: NGXLogger,
    private navParams: NavParams,
    private cbService: ClipboardService,
    private events: Events,
    private translate: TranslateService,
    private feedbackUI: FeedbackUIService
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    this.logger.debug('navParams', this.navParams.data);
    this.content = this.navParams.get('content');
    if (!this.content) {
      this.content = '';
    }
  }

  onCopyBtnClick() {
    this.feedbackUI.showToast(this.translate.instant('wallet.address.copied'));
    this.cbService.copyFromContent(this.content);
    this.isCopyComplete = true;

    if (this.timeoutRunner !== null) {
      clearTimeout(this.timeoutRunner);
      this.timeoutRunner = null;
    }

    this.timeoutRunner = setTimeout(() => {
      this.isCopyComplete = false;
    }, 3000);
  }

  onCloseBtnTap() {
    this.events.publish(Consts.EVENT_CLOSE_MODAL);
  }
}
