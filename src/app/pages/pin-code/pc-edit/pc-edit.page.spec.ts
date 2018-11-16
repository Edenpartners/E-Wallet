import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PcEditPage } from './pc-edit.page';

describe('PcEditPage', () => {
  let component: PcEditPage;
  let fixture: ComponentFixture<PcEditPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PcEditPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PcEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
