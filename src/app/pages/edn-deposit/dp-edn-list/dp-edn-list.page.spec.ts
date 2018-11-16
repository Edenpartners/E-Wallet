import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DpEdnListPage } from './dp-edn-list.page';

describe('DpEdnListPage', () => {
  let component: DpEdnListPage;
  let fixture: ComponentFixture<DpEdnListPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DpEdnListPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DpEdnListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
