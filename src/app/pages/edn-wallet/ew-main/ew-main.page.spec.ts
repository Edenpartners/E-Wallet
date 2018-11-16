import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EwMainPage } from './ew-main.page';

describe('EwMainPage', () => {
  let component: EwMainPage;
  let fixture: ComponentFixture<EwMainPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EwMainPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EwMainPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
