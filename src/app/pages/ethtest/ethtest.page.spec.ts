import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EthtestPage } from './ethtest.page';

describe('EthtestPage', () => {
  let component: EthtestPage;
  let fixture: ComponentFixture<EthtestPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EthtestPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EthtestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
