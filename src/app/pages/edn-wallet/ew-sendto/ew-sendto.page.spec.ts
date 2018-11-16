import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EwSendtoPage } from './ew-sendto.page';

describe('EwSendtoPage', () => {
  let component: EwSendtoPage;
  let fixture: ComponentFixture<EwSendtoPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EwSendtoPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EwSendtoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
