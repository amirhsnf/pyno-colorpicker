export type PynoColorMode =
  | 'hex'
  | 'rgb'
  | 'hsl';
export type PynoColorHexObject = {
  hex: string,
  alpha: number
}
export type PynoColorRgbObject = {
  r: number,
  g: number,
  b: number,
  a: number
}
export type PynoColorHslObject = {
  h: number,
  s: number,
  l: number,
  a: number
}
export type PynoColorHsvObject = {
  h: number,
  s: number,
  v: number,
  a: number
}
export type PynoColorpickerOutput = {
  hex: string,
  rgb: string,
  rgbObject: {
    r: number,
    g: number,
    b: number
  },
  hsl: string,
  hslObject: {
    h: number,
    s: number,
    l: number
  },
  alpha: number
}
