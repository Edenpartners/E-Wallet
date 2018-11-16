import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EwTxListPage } from './ew-tx-list.page';

describe('EwTxListPage', () => {
  let component: EwTxListPage;
  let fixture: ComponentFixture<EwTxListPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EwTxListPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EwTxListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
