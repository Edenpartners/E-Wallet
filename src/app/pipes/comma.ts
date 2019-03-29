import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({ name: 'comma' })
export class CommaPipe implements PipeTransform {
  static onlyNumberPattern = /\B(?=(\d{3})+(?!\d))/g;
  static pattern = /\B(?=(.{3})+(?!\d))/g;

  private applyPrecision = false;

  constructor(private sanitized: DomSanitizer) {}

  transform(value: string) {
    return this.numberWithCommas(value);
  }

  reversedString(value: string) {
    return value
      .split('')
      .reverse()
      .join('');
  }

  numberWithCommas(value: string): string {
    if (!value) {
      return '';
    }
    const parts = value.toString().split('.');
    if (parts.length > 0) {
      parts[0] = parts[0].replace(CommaPipe.pattern, ',');
    }

    if (this.applyPrecision && parts.length > 1) {
      let precisionValue = parts[1];
      precisionValue = this.reversedString(precisionValue);
      precisionValue = precisionValue.replace(CommaPipe.pattern, ',');
      precisionValue = this.reversedString(precisionValue);
      parts[1] = precisionValue;
    }

    return parts.join('.');
  }
}
