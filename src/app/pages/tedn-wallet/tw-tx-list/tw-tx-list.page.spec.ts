import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TwTxListPage } from './tw-tx-list.page';

describe('TwTxListPage', () => {
  let component: TwTxListPage;
  let fixture: ComponentFixture<TwTxListPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TwTxListPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TwTxListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
