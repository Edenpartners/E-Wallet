import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupWalletPage } from './backup-wallet.page';

describe('BackupWalletPage', () => {
  let component: BackupWalletPage;
  let fixture: ComponentFixture<BackupWalletPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BackupWalletPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupWalletPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
