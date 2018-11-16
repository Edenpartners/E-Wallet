import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupNoticePage } from './backup-notice.page';

describe('BackupNoticePage', () => {
  let component: BackupNoticePage;
  let fixture: ComponentFixture<BackupNoticePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BackupNoticePage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupNoticePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
