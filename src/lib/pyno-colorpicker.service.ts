import { Injectable } from '@angular/core';
import {
  PynoColorHexObject,
  PynoColorHslObject, PynoColorHsvObject,
  PynoColorMode,
  PynoColorRgbObject
} from './pyno-colorpicker.type';

@Injectable({
  providedIn: 'root',
})
export class PynoColorpickerService {
  getMode(val: string): PynoColorMode | null {
    if (this.isHex(val)) return 'hex';
    if (this.isRgb(val)) return 'rgb';
    if (this.isHsl(val)) return 'hsl';
    return null;
  }
  private isHex(val: string) {
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(val);
  }
  private rgbRegex() {
    const num = String.raw`\d+(?:\.\d*)?|\.\d+`;
    const pct = String.raw`(?:${num})%`;
    const a = String.raw`(?:${num}|${pct})`;
    const c = String.raw`(?:${num}|${pct})`;
    const legacyNums = String.raw`(${num})\s*,\s*(${num})\s*,\s*(${num})(?:\s*,\s*(${a}))?`;
    const legacyPcts = String.raw`(${pct})\s*,\s*(${pct})\s*,\s*(${pct})(?:\s*,\s*(${a}))?`;
    const modern = String.raw`(${c})\s+(${c})\s+(${c})(?:\s*/\s*(${a}))?`;
    return new RegExp(
      String.raw`^\s*rgba?\(\s*(?:${legacyNums}|${legacyPcts}|${modern})\s*\)\s*$`,
      'i',
    );
  }
  private hslRegex() {
    const num = String.raw`\d+(?:\.\d*)?|\.\d+`;
    const pct = String.raw`(?:${num})%`;
    const a = String.raw`(?:${num}|${pct})`;
    const hueUnit = String.raw`(?:deg|grad|rad|turn)`;
    const hue = String.raw`(?:${num})${hueUnit}?`;
    const legacy = String.raw`(${hue})\s*,\s*(${pct})\s*,\s*(${pct})(?:\s*,\s*(${a}))?`;
    const modern = String.raw`(${hue})\s+(${pct})\s+(${pct})(?:\s*/\s*(${a}))?`;
    return new RegExp(String.raw`^\s*hsla?\(\s*(?:${legacy}|${modern})\s*\)\s*$`, 'i');
  }
  isRgb(val: string) {
    return this.rgbRegex().test(val);
  }
  private isHsl(val: string) {
    return this.hslRegex().test(val);
  }
  parseHex(val: string): PynoColorHexObject | null {
    const body = val.slice(1).toLowerCase();
    let hex: string;
    let alpha: number;
    switch (body.length) {
      case 3: {
        hex = '#' + body[0] + body[0] + body[1] + body[1] + body[2] + body[2];
        alpha = 1;
        break;
      }
      case 6: {
        hex = '#' + body;
        alpha = 1;
        break;
      }
      case 8: {
        hex = '#' + body.slice(0, 6);
        alpha = Math.round((parseInt(body.slice(6, 8), 16) / 255) * 100) / 100;
        break;
      }
      default:
        return null;
    }
    return {
      hex: hex,
      alpha: alpha,
    };
  }
  parseRgb(val: string): PynoColorRgbObject | null {
    const m = this.rgbRegex().exec(val)!;
    const toNum = (v: string) => parseFloat(v);
    const toAlpha = (v: string) => {
      if (v === null) return 1;
      return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
    };
    const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
    let r, g, b, a;
    if (m[1] != null) {
      r = toNum(m[1]);
      g = toNum(m[2]);
      b = toNum(m[3]);
      a = m[4] ? toAlpha(m[4]) : 1;
    } else if (m[5] != null) {
      r = (toNum(m[5]) / 100) * 255;
      g = (toNum(m[6]) / 100) * 255;
      b = (toNum(m[7]) / 100) * 255;
      a = m[8] ? toAlpha(m[8]) : 1;
    } else if (m[9] != null) {
      const comp = (v: string) => (v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v));
      r = comp(m[9]);
      g = comp(m[10]);
      b = comp(m[11]);
      a = m[12] ? toAlpha(m[12]) : 1;
    } else {
      return null;
    }
    return {
      r: Math.round(clamp(r, 0, 255)),
      g: Math.round(clamp(g, 0, 255)),
      b: Math.round(clamp(b, 0, 255)),
      a: clamp(a, 0, 1),
    };
  }
  parseHsl(val: string): PynoColorHslObject | null {
    const m = this.hslRegex().exec(val)!;
    const toNum = (v: string) => parseFloat(v);
    const toAlpha = (v: string) => {
      if (v === null || v === undefined) return 1;
      return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
    };
    const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
    const toHue = (v: string): number => {
      const hm = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([a-z]*)$/.exec(v)!;
      const n = toNum(hm[1]);
      const unit = hm[2] || 'deg';
      let deg: number;
      switch (unit) {
        case 'deg':
          deg = n;
          break;
        case 'grad':
          deg = n * 0.9;
          break;
        case 'rad':
          deg = (n * 180) / Math.PI;
          break;
        case 'turn':
          deg = n * 360;
          break;
        default:
          return NaN;
      }
      return ((deg % 360) + 360) % 360;
    };
    const toPct = (v: string): number => clamp(toNum(v), 0, 100);
    let h: number, s: number, l: number, a: number;
    if (m[1] != null) {
      h = toHue(m[1]);
      s = toPct(m[2]);
      l = toPct(m[3]);
      a = m[4] ? toAlpha(m[4]) : 1;
    } else if (m[5] != null) {
      h = toHue(m[5]);
      s = toPct(m[6]);
      l = toPct(m[7]);
      a = m[8] ? toAlpha(m[8]) : 1;
    } else {
      return null;
    }
    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l) || Number.isNaN(a)) {
      return null;
    }
    return {
      h: Math.round(h),
      s: Math.round(s),
      l: Math.round(l),
      a: clamp(a, 0, 1),
    };
  }
  hexToRgb(hex: string): PynoColorRgbObject {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const n = parseInt(hex, 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return {
      r: r,
      g: g,
      b: b,
      a: 1,
    };
  }
  rgbToHsl(rgb: PynoColorRgbObject): PynoColorHslObject {
    let { r, g, b } = rgb;
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) {
      return {
        h: 0,
        s: 0,
        l: Math.round(100 * l),
        a: 1,
      };
    }
    const s = d / (1 - Math.abs(2 * l - 1));
    let h: number;
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
    return {
      h: Math.round(h),
      s: Math.round(100 * s),
      l: Math.round(100 * l),
      a: 1,
    };
  }
  rgbToHsv(rgb: PynoColorRgbObject): PynoColorHsvObject {
    let { r, g, b } = rgb;
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const v = max;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
      if (max === r) {
        h = ((g - b) / d) % 6;
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
      a: 1,
    };
  }
  hsvToRgb(hsv: PynoColorHsvObject): PynoColorRgbObject {
    const h = ((hsv.h % 360) + 360) % 360;
    const s = Math.min(100, Math.max(0, hsv.s)) / 100;
    const v = Math.min(100, Math.max(0, hsv.v)) / 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r1: number, g1: number, b1: number;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const clamp = (n: number) => Math.min(255, Math.max(0, n));
    return {
      r: Math.round(clamp((r1 + m) * 255)),
      g: Math.round(clamp((g1 + m) * 255)),
      b: Math.round(clamp((b1 + m) * 255)),
      a: 1,
    };
  }
  rgbToHex(rgb: PynoColorRgbObject) {
    const { r, g, b } = rgb;
    const toHex = (n: number): string => {
      const clamped = Math.min(255, Math.max(0, Math.round(n)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  hslToRgb(hsl: PynoColorHslObject): PynoColorRgbObject{
    let { h, s, l } = hsl;
    h = ((h % 360) + 360) % 360;
    s = Math.min(100, Math.max(0, s)) / 100;
    l = Math.min(100, Math.max(0, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1: number, g1: number, b1: number;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const clamp = (n: number) => Math.min(255, Math.max(0, n));
    return {
      r: Math.round(clamp((r1 + m) * 255)),
      g: Math.round(clamp((g1 + m) * 255)),
      b: Math.round(clamp((b1 + m) * 255)),
      a: 1,
    };
  }
  alphaToHex(alpha: number): string {
    const clamped = Math.min(1, Math.max(0, alpha));
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, '0');
  }
  // rgbToHsv(rgb: PynoColorRgbObject): PynoColorHsvObject {
  //   const { r, g, b } = rgb;
  //   const max = Math.max(r, g, b);
  //   const min = Math.min(r, g, b);
  //   const v = Math.round(100 * max);
  //   const d = max - min;
  //   if (d === 0) {
  //     return {
  //       h: 0,
  //       s: 0,
  //       v: v,
  //     };
  //   }
  //   const s = Math.round(100 * (d / max));
  //   let h: number;
  //   if (r === min) {
  //     h = 3 - (g - b) / d;
  //   } else if (b === min) {
  //     h = 1 - (r - g) / d;
  //   } else {
  //     h = 5 - (b - r) / d;
  //   }
  //   h = Math.round(60 * h);
  //   return {
  //     h: h,
  //     s: s,
  //     v: v,
  //   };
  // }
}
