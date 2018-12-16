import * as CryptoJS from 'crypto-js';

export class CryptoHelper {
  static getKeyAndIV(password: string, salt?: string) {
    const keyBitLength = 256;
    const ivBitLength = 128;
    const iterations = 234;

    const bytesInSalt = 128 / 8;
    if (!salt) {
      salt = CryptoHelper.createRandSalt();
    }

    const iv128Bits = CryptoJS.PBKDF2(password, salt, {
      keySize: ivBitLength / 32,
      iterations: iterations
    });
    const key256Bits = CryptoJS.PBKDF2(password, salt, {
      keySize: keyBitLength / 32,
      iterations: iterations
    });

    return {
      iv: iv128Bits.toString(CryptoJS.enc.Base64),
      key: key256Bits.toString(CryptoJS.enc.Base64)
    };
  }

  static createRandSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }
}
