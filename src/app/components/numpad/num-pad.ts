import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  OnDestroy
} from '@angular/core';
import { SafeMemoryStorage } from '../../utils/safeMemoryStorage';
import { UUID } from 'angular2-uuid';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'num-pad',
  templateUrl: 'num-pad.html',
  styleUrls: ['num-pad.scss']
})
export class NumPad implements OnInit, OnDestroy {
  userInputCount = 0;
  memStorage = new SafeMemoryStorage();
  encryptPassword = null;

  @Output() change = new EventEmitter<any>();

  constructor(private logger: NGXLogger) {}

  ngOnInit() {
    this.encryptPassword = UUID.UUID();
  }
  ngOnDestroy() {
    this.clear();
  }

  inputPin(code) {
    if (this.userInputCount >= 6) {
      return;
    }

    if (this.userInputCount <= 0) {
      this.updatePinCode(String(code));
    } else {
      this.updatePinCode(this.memStorage.getDecrypted('code') + String(code));
    }

    this.userInputCount += 1;
    this.change.emit();
  }

  delPin() {
    if (this.userInputCount > 0) {
      const val = this.memStorage.getDecrypted('code');
      const newVal = val.substring(0, val.length - 1);

      this.updatePinCode(newVal);
      this.userInputCount -= 1;
      this.change.emit();
    }
  }

  clearPinCode() {
    this.updatePinCode('');
    this.userInputCount = 0;
  }

  updatePinCode(val) {
    this.memStorage.setWithEncryption('code', val, this.encryptPassword);
  }

  getEncryptedUserInput() {
    return this.memStorage.getEncryptedText('code');
  }

  getDecryptedUserInput() {
    return this.memStorage.getDecrypted('code');
  }

  getUserInputCount() {
    return this.userInputCount;
  }

  saveCurrentInputAndReset() {
    this.memStorage.setWithEncryption(
      'saved',
      this.getDecryptedUserInput(),
      this.encryptPassword
    );

    this.memStorage.remove('code');
    this.userInputCount = 0;
  }

  compareWithSavedInput(): boolean {
    const savedVal = this.memStorage.getDecrypted('saved');
    if (!savedVal) {
      return false;
    }

    if (savedVal === this.getDecryptedUserInput()) {
      return true;
    }
    return false;
  }

  clear() {
    this.memStorage.clear();
    this.userInputCount = 0;
  }
}
