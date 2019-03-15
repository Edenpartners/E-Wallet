import { ethers, Wallet, Contract } from 'ethers';
import { BigNumber } from 'ethers/utils';

export class BigNumberHelper {
  /**
   * remove double dot
   */
  static safeText(originalText: string, decimals: number): string {
    let bn: BigNumber = null;
    try {
      bn = ethers.utils.parseUnits(originalText, decimals);
    } catch (e) {}

    let result = originalText;

    if (bn === null) {
      const texts = originalText.split('.');

      if (texts.length > 1) {
        result = texts[0] + '.' + texts[1];

        const precisionsText = texts[1];

        if (precisionsText.length > decimals) {
          result = texts[0] + '.' + precisionsText.substr(0, decimals);
        }
      }
    }

    return result;
  }

  static removeZeroPrecision(numberText: string): string {
    const dotIndex = numberText.indexOf('.');
    if (dotIndex > 0) {
      const otherText = numberText.substring(dotIndex);
      if (otherText === '.0') {
        return numberText.substring(0, dotIndex);
      }
    }

    return numberText;
  }
}
