import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RestoreWalletPage } from './restore-wallet.page';

describe('RestoreWalletPage', () => {
  let component: RestoreWalletPage;
  let fixture: ComponentFixture<RestoreWalletPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RestoreWalletPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RestoreWalletPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
