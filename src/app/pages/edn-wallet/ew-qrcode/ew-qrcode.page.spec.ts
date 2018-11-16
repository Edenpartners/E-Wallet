import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EwQrcodePage } from './ew-qrcode.page';

describe('EwQrcodePage', () => {
  let component: EwQrcodePage;
  let fixture: ComponentFixture<EwQrcodePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EwQrcodePage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EwQrcodePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
