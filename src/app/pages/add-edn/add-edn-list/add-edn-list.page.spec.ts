import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEdnListPage } from './add-edn-list.page';

describe('AddEdnListPage', () => {
  let component: AddEdnListPage;
  let fixture: ComponentFixture<AddEdnListPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddEdnListPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEdnListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
