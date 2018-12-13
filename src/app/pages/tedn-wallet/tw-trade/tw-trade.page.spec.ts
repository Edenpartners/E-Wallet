import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TwTradePage } from './tw-trade.page';

describe('TwTradePage', () => {
  let component: TwTradePage;
  let fixture: ComponentFixture<TwTradePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TwTradePage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TwTradePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
