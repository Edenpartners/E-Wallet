import { IonInput } from '@ionic/angular';

const windowSizeChecker = null;
const maxWindowSize = { width: 0, height: 0 };

export class IonComponentUtils {
  static isInputHasNonZero(input: IonInput): boolean {
    return IonComponentUtils.isNonZero(input.value);
  }

  static isNonZero(val: any) {
    let numval = null;
    if (!val) {
      return false;
    }
    try {
      numval = parseFloat(val);
    } catch (e) {}
    if (numval !== undefined && numval !== null && numval !== 0) {
      return true;
    }
    return false;
  }

  static isInputHasValue(input: IonInput): boolean {
    return IonComponentUtils.hasValue(input.value);
  }

  static hasValue(val: any): boolean {
    if (!val) {
      return false;
    }

    let result = false;
    try {
      if (val.length < 1) {
        result = true;
      }
    } catch (e) {}

    return result;
  }

  static blurAllInputs() {
    IonComponentUtils.blurElements(document.getElementsByTagName('ion-input'));
    IonComponentUtils.blurElements(document.getElementsByTagName('ion-textarea'));
    IonComponentUtils.blurElements(document.getElementsByTagName('input'));
  }

  static blurElements(els: HTMLCollectionOf<Element>) {
    if (!els) {
      return;
    }

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el instanceof HTMLElement) {
        el.blur();
      }
    }
  }

  /**
   * Ionic has a strange bug on exchanging pages.
   * It related with focus behaviour of Input elements.
   * And it will clear with this.
   */
  static blurActiveElement() {
    IonComponentUtils.blurAllInputs();

    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      const el = document.activeElement as HTMLElement;
      const tagName = el.tagName;
      if (tagName) {
        const lowerTagName = tagName.toLowerCase();
        if (lowerTagName.indexOf('input') >= 0 || lowerTagName.indexOf('textarea') >= 0 || lowerTagName.indexOf('button') >= 0) {
          el.blur();
        }
      }
    }

    const bodyEls = document.getElementsByTagName('body');
    if (bodyEls) {
      const bodyElement = bodyEls[0];
      if (bodyElement) {
        bodyElement.focus();
      }
    }
  }

  static startWindowSizeChecker() {
    setInterval(function() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width > maxWindowSize.width) {
        maxWindowSize.width = width;
      }
      if (height > maxWindowSize.height) {
        maxWindowSize.height = height;
      }
    }, 1000);
  }

  static isWindowSizeIsSmall(checkOnlyHeight = true): Boolean {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!checkOnlyHeight && width < maxWindowSize.width) {
      return true;
    }
    if (height < maxWindowSize.height) {
      const diffChecker = maxWindowSize.height * 0.9;
      if (height < diffChecker) {
        return true;
      }
    }

    return false;
  }
}
