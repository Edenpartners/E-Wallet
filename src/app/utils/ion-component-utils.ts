import { IonInput } from '@ionic/angular';

export class IonComponentUtils {
  static isInputHasNonZero(input: IonInput): boolean {
    const val = input.value;
    let numval = null;
    if (!val) {
      return false;
    }
    try {
      numval = parseFloat(input.value);
    } catch (e) {}
    if (numval !== undefined && numval !== null && numval !== 0) {
      return true;
    }
    return false;
  }

  static isInputHasValue(input: IonInput): boolean {
    const val = input.value;
    if (!val) {
      return false;
    }

    if (val.length < 1) {
      return false;
    }

    return true;
  }
}
