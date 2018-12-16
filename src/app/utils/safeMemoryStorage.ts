import { listutil, Map } from '../utils/listutil';
import { Consts } from 'src/environments/constants';
import * as CryptoJS from 'crypto-js';
import { UUID } from 'angular2-uuid';

export class SafeMemoryStorage {
  private encryptedMap: Map<any> = {};
  private encryptedMapPasswords: Map<string> = {};

  setWithEncryption(key: string, val: string, password?: string) {
    if (!password) {
      password = UUID.UUID();
    }

    this.encryptedMapPasswords[key] = password;
    const encryptedVal = CryptoJS.AES.encrypt(val, password);
    this.encryptedMap[key] = encryptedVal;
  }

  getDecrypted(key: string): string | undefined | null {
    if (
      this.encryptedMap[key] === undefined ||
      this.encryptedMapPasswords[key] === undefined
    ) {
      return undefined;
    }

    const password = this.encryptedMapPasswords[key];
    const encryptedVal = this.encryptedMap[key];
    const decryptedVal = CryptoJS.AES.decrypt(encryptedVal, password).toString(
      CryptoJS.enc.Utf8
    );

    return decryptedVal;
  }

  getEncryptedText(key: string): string | undefined | null {
    if (
      this.encryptedMap[key] === undefined ||
      this.encryptedMapPasswords[key] === undefined
    ) {
      return undefined;
    }

    const result = this.encryptedMap[key].toString();
    return result;
  }

  remove(key: string) {
    if (this.encryptedMap[key] !== undefined) {
      delete this.encryptedMap[key];
      delete this.encryptedMapPasswords[key];
    }
  }

  clear() {
    for (const key of Object.keys(this.encryptedMap)) {
      delete this.encryptedMap[key];
    }

    for (const key of Object.keys(this.encryptedMapPasswords)) {
      delete this.encryptedMapPasswords[key];
    }
  }
}
