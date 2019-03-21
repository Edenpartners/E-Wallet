export class TextUtils {
  static canvas: HTMLCanvasElement = null;
  static measureTextWithCanvas(text, font) {
    if (TextUtils.canvas === null) {
      TextUtils.canvas = document.createElement('canvas');
    }

    const context = TextUtils.canvas.getContext('2d');
    context.font = font;

    return context.measureText(text);
  }

  static measureTextWithEl(
    text: string,
    fontOptions: { fontFamily?: string; fontSize?: string; lineHeight?: string; fontWeight?: string },
    width?: number
  ): {
    width: number;
    height: number;
    lineCount: number;
  } {
    const el: HTMLElement = document.createElement('div');
    document.body.appendChild(el);

    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.0';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.wordBreak = 'break-word';

    if (width) {
      el.style.width = String(width) + 'px';
    }

    el.style.height = 'auto';

    if (fontOptions.fontFamily) {
      el.style.fontFamily = fontOptions.fontFamily;
    }
    if (fontOptions.fontSize) {
      el.style.fontSize = fontOptions.fontSize;
    }
    if (fontOptions.fontWeight) {
      el.style.fontWeight = fontOptions.fontWeight;
    }
    if (fontOptions.lineHeight) {
      el.style.lineHeight = fontOptions.lineHeight;
    }

    el.innerHTML = text;

    const result: any = {
      width: el.clientWidth,
      height: el.clientHeight
    };

    el.innerHTML = '0';
    const oneLineResult = {
      width: el.clientWidth,
      height: el.clientHeight
    };

    result.lineCount = result.height / oneLineResult.height;

    el.remove();

    return result;
  }
}
