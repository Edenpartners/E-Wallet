import { Directive, ElementRef, Input, OnChanges, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TextUtils } from '../utils/textutils';

/**
 * https://nitayneeman.com/posts/listening-to-dom-changes-using-mutationobserver-in-angular/
 */
@Directive({
  selector: '[appMultilineLayout]',
  exportAs: 'multilineLayout'
})
export class MultilineLayoutDirective implements OnInit, OnDestroy {
  @Input('appMultilineLayout') options: {
    fontSizeForSingle?: string;
    fontSizeForMulti?: string;
    textAlignForSingle?: string;
    textAlignForMulti?: string;
    altContentText?: string;
  };

  originFontSize: string = null;

  private changes: MutationObserver;

  ngOnInit() {
    this.setOriginFontSize();

    this.changes = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((mutation: MutationRecord) => {
        if (mutation.type === 'characterData') {
          this.updateLayout();
        }
      });
    });

    //listen for innerHTML ( innerText ) change
    this.changes.observe(this.target.nativeElement, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      characterDataOldValue: true
    });
  }

  ngOnDestroy() {
    this.changes.disconnect();
  }

  private getContentText(): string {
    if (this.options.altContentText !== null && this.options.altContentText !== undefined) {
      return this.options.altContentText;
    }

    return this.target.nativeElement.innerText;
  }

  private getElement(): HTMLElement {
    return this.target.nativeElement;
  }

  private setOriginFontSize() {
    const cStyle = getComputedStyle(this.getElement());
    if (this.originFontSize === null) {
      this.originFontSize = cStyle.fontSize;
    }
  }

  private getFontSizeForLineCount(lineCount: number): string {
    if (lineCount > 1) {
      return this.options.fontSizeForMulti;
    }

    return this.options.fontSizeForSingle;
  }

  private getTextAlignForLineCount(lineCount: number): string {
    if (lineCount > 1) {
      if (this.options.textAlignForMulti) {
        return this.options.textAlignForMulti;
      } else {
        return null;
      }
    } else {
      if (this.options.textAlignForSingle) {
        return this.options.textAlignForSingle;
      } else {
        return null;
      }
    }
  }

  constructor(private target: ElementRef) {}

  public updateLayout() {
    const labelEl: HTMLElement = this.getElement();
    const cStyle = getComputedStyle(labelEl);

    const contentText = this.getContentText();

    const labelWidth: number = labelEl.getBoundingClientRect().width;
    const measured = TextUtils.measureTextWithEl(
      contentText,
      { fontFamily: cStyle.fontFamily, fontSize: this.originFontSize, fontWeight: cStyle.fontWeight, lineHeight: cStyle.lineHeight },
      labelWidth
    );

    const fontSize = this.getFontSizeForLineCount(measured.lineCount);

    labelEl.style.fontSize = fontSize;

    const lastMeasured = TextUtils.measureTextWithEl(
      contentText,
      {
        fontFamily: cStyle.fontFamily,
        fontSize: fontSize,
        fontWeight: cStyle.fontWeight,
        lineHeight: cStyle.lineHeight
      },
      labelWidth
    );

    labelEl.style.textAlign = this.getTextAlignForLineCount(lastMeasured.lineCount);
  }
}
