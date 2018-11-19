import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TwMainPage } from './tw-main.page';

describe('TwMainPage', () => {
  let component: TwMainPage;
  let fixture: ComponentFixture<TwMainPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TwMainPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TwMainPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
