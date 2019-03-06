import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentPopupPage } from './content-popup.page';

describe('ContentPopupPage', () => {
  let component: ContentPopupPage;
  let fixture: ComponentFixture<ContentPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContentPopupPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
