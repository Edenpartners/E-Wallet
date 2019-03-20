import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RegauthIntroPage } from './regauth-intro.page';

describe('RegauthIntroPage', () => {
  let component: RegauthIntroPage;
  let fixture: ComponentFixture<RegauthIntroPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RegauthIntroPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegauthIntroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
