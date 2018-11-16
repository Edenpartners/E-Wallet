import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DpEdnMainPage } from './dp-edn-main.page';

describe('DpEdnMainPage', () => {
  let component: DpEdnMainPage;
  let fixture: ComponentFixture<DpEdnMainPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DpEdnMainPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DpEdnMainPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
