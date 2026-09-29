import {
  afterEveryRender,
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {PynoColorHsvObject, PynoColorMode, PynoColorpickerOutput, PynoColorRgbObject} from './pyno-colorpicker.type';
import {PynoColorpickerService} from './pyno-colorpicker.service';
@Component({
  imports: [],
  selector: 'pyno-colorpicker',
  templateUrl: './pyno-colorpicker.html',
  styleUrl: './pyno-colorpicker.css',
})
export class PynoColorpicker {
  // View Children
  readonly board = viewChild<ElementRef<HTMLElement>>('board');
  readonly hBar = viewChild<ElementRef<HTMLElement>>('hBar');
  readonly aBar = viewChild<ElementRef<HTMLElement>>('aBar');

  // Inputs & Outputs & PynoColorpicker Service
  cc = inject(PynoColorpickerService);
  triggerFor = input<HTMLElement>();
  inline = input(false);
  colorModes = input<PynoColorMode[]>(['hex', 'hsl', 'rgb']);
  disableAlpha = input<boolean>(false);
  initValue = input<string | null | undefined>(null, { alias: 'value' });
  width = input<number>(300);
  positionX = input<'left' | 'center' | 'right'>('left');
  onChange = output<PynoColorpickerOutput>();
  onChangeEnd = output<PynoColorpickerOutput>();

  // Public State
  readonly isOpen = signal(false);
  readonly position = signal<{ top: number; left: number } | null>(null);
  readonly mode = signal<PynoColorMode>('hex');
  readonly alpha = signal(1);
  readonly hsl = { h: signal(0), s: signal(100), l: signal(50) };
  readonly rgb = { r: signal(255), g: signal(0), b: signal(0) };
  readonly hsv = { h: signal(0), s: signal(100), v: signal(100) };
  readonly hex = signal('#ff0000');

  // Computed Outputs
  readonly hexOutput = computed(
    () => this.hex() + (this.alpha() < 1 ? this.cc.alphaToHex(this.alpha()) : ''),
  );
  readonly rgbOutput = computed(
    () =>
      `rgb(${this.rgb.r()} ${this.rgb.g()} ${this.rgb.b()}` +
      (this.alpha() < 1 ? ` / ${this.alpha()}` : '') +
      ')',
  );
  readonly hslOutput = computed(
    () =>
      `hsl(${this.hsl.h()} ${this.hsl.s()}% ${this.hsl.l()}%` +
      (this.alpha() < 1 ? ` / ${this.alpha()}` : '') +
      ')',
  );
  readonly modeOutput = computed(() => {
    switch (this.mode()) {
      case 'hex':
        return this.hexOutput();
      case 'hsl':
        return this.hslOutput();
      case 'rgb':
        return this.rgbOutput();
      default:
        return '';
    }
  });

  // Thumb Positions
  readonly hPosition = computed(() => (this.hsv.h() / 360) * 100);
  readonly aPosition = computed(() => this.alpha() * 100);
  readonly bxPosition = computed(() => this.hsv.s());
  readonly byPosition = computed(() => 100 - this.hsv.v());

  // Internals
  readonly supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  private readonly cleanupFns: Array<() => void> = [];
  protected copied = signal(false);
  private onClickInit = false;
  private attachDragsInit = false;

  constructor() {
    afterNextRender(() => {
      const tf = this.triggerFor();
      if (!tf) return;
      const onClick = () => this.open();
      tf.addEventListener('click', onClick);

      const onWindowChange = () => {
        if (this.isOpen() && !this.inline()) this.updatePosition();
      };
      window.addEventListener('resize', onWindowChange);
      window.addEventListener('scroll', onWindowChange);

      this.cleanupFns.push(() => {
        tf.removeEventListener('click', onClick);
        window.removeEventListener('resize', onWindowChange);
        window.removeEventListener('scroll', onWindowChange);
      });
    });
    afterEveryRender(() => {
      if (!this.attachDragsInit) this.attachDrags();
    });
  }
  private attachDrags() {
    const hBar = this.hBar();
    const board = this.board();
    const aBar = this.aBar();
    if (hBar && board) {
      this.attachDrag(
        () => hBar.nativeElement,
        (e) => this.setHueFromEvent(e),
      );
      this.attachDrag(
        () => board.nativeElement,
        (e) => this.setBoardFromEvent(e),
      );
      if (aBar) {
        this.attachDrag(
          () => aBar.nativeElement,
          (e) => this.setAlphaFromEvent(e),
        );
      }
      this.attachDragsInit = true;
    }
  }

  // Lifecycle
  ngOnInit() {
    this.mode.set(this.colorModes()[0]);
    if (this.inline()) {
      this.init(this.initValue());
    }
  }
  ngOnDestroy() {
    this.cleanupFns.forEach((fn) => fn());
  }

  // Drag Infrastructure
  private dragHandlers(getBar: () => HTMLElement, setFromEvent: (e: PointerEvent) => void) {
    let dragging = false;
    return {
      down: (e: PointerEvent) => {
        e.preventDefault();
        dragging = true;
        getBar().setPointerCapture?.(e.pointerId);
        setFromEvent(e);
      },
      move: (e: PointerEvent) => {
        if (!dragging) return;
        setFromEvent(e);
        this.onChange.emit(this.output());
      },
      up: (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        getBar().releasePointerCapture?.(e.pointerId);
        this.onChange.emit(this.output());
        this.onChangeEnd.emit(this.output());
      },
    };
  }
  private attachDrag(getBar: () => HTMLElement, setFromEvent: (e: PointerEvent) => void) {
    const { down, move, up } = this.dragHandlers(getBar, setFromEvent);
    const bar = getBar();
    bar.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.cleanupFns.push(() => {
      bar.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    });
  }

  // Position Extractors
  private ratioFromEvent(e: PointerEvent, el: HTMLElement, axis: 'x' | 'y' = 'x'): number {
    const rect = el.getBoundingClientRect();
    const value = axis === 'x' ? e.clientX - rect.left : e.clientY - rect.top;
    const size = axis === 'x' ? rect.width : rect.height;
    return Math.min(1, Math.max(0, value / size));
  }
  private setHueFromEvent(e: PointerEvent) {
    const ratio = this.ratioFromEvent(e, this.hBar()!.nativeElement, 'x');
    let h = Math.round(ratio * 360);
    if (h === 360) h = 0;
    this.hsv.h.set(h);
    this.syncFromHsv();
  }
  private setBoardFromEvent(e: PointerEvent) {
    const el = this.board()!.nativeElement;
    const sRatio = this.ratioFromEvent(e, el, 'x');
    const vRatio = this.ratioFromEvent(e, el, 'y');
    this.hsv.s.set(sRatio * 100);
    this.hsv.v.set((1 - vRatio) * 100);
    this.syncFromHsv();
  }
  private setAlphaFromEvent(e: PointerEvent) {
    const ratio = this.ratioFromEvent(e, this.aBar()!.nativeElement, 'x');
    this.alpha.set(Math.round(ratio * 100) / 100);
  }

  // Color Sync
  private syncFromRgb(rgb: PynoColorRgbObject) {
    this.rgb.r.set(rgb.r);
    this.rgb.g.set(rgb.g);
    this.rgb.b.set(rgb.b);
    this.hex.set(this.cc.rgbToHex(rgb));
    const hsl = this.cc.rgbToHsl(rgb);
    this.hsl.h.set(hsl.h);
    this.hsl.s.set(hsl.s);
    this.hsl.l.set(hsl.l);
    const hsv = this.cc.rgbToHsv(rgb);
    this.hsv.h.set(hsv.h);
    this.hsv.s.set(hsv.s);
    this.hsv.v.set(hsv.v);
  }
  private syncFromHsv() {
    const hsv: PynoColorHsvObject = {
      h: this.hsv.h(),
      s: this.hsv.s(),
      v: this.hsv.v(),
      a: 1,
    };
    const rgb = this.cc.hsvToRgb(hsv);
    this.rgb.r.set(rgb.r);
    this.rgb.g.set(rgb.g);
    this.rgb.b.set(rgb.b);
    this.hex.set(this.cc.rgbToHex(rgb));
    const hsl = this.cc.rgbToHsl(rgb);
    this.hsl.h.set(hsl.h);
    this.hsl.s.set(hsl.s);
    this.hsl.l.set(hsl.l);
  }

  // Public API
  open() {
    this.init(this.initValue());
    this.isOpen.set(true);
    this.updatePosition();
  }
  close() {
    this.isOpen.set(false);
    this.attachDragsInit = false;
  }
  output(): PynoColorpickerOutput {
    return {
      hex: this.hexOutput(),
      rgb: this.rgbOutput(),
      rgbObject: {
        r: this.rgb.r(),
        g: this.rgb.g(),
        b: this.rgb.b(),
      },
      hsl: this.hslOutput(),
      hslObject: {
        h: this.hsl.h(),
        s: this.hsl.s(),
        l: this.hsl.l(),
      },
      alpha: this.alpha(),
    };
  }

  // Internals
  protected init(val: string | null | undefined) {
    if (!val) return;
    const normalized = val.trim().replace(/\s+/g, ' ').toLowerCase();
    const mode = this.cc.getMode(normalized);
    if (!mode) return;
    switch (mode) {
      case 'hex':
        this.handleHex(normalized);
        break;
      case 'rgb':
        this.handleRgb(normalized);
        break;
      case 'hsl':
        this.handleHsl(normalized);
        break;
    }
    this.onChange.emit(this.output());
    this.onChangeEnd.emit(this.output());
  }
  private updatePosition() {
    if (this.inline()) return;
    const tf = this.triggerFor();
    if (!tf) return;
    const rect = tf.getBoundingClientRect();
    const pickerWidth = this.width();
    const gap = 0;
    let left: number;
    switch (this.positionX()) {
      case 'left':
        left = rect.left;
        break;
      case 'center':
        left = rect.left + rect.width / 2 - pickerWidth / 2;
        break;
      case 'right':
        left = rect.right - pickerWidth;
        break;
    }
    const top = rect.bottom + gap;
    left = Math.min(Math.max(0, left), window.innerWidth - pickerWidth);
    this.position.set({ top, left });
  }
  protected changeMode() {
    const modes = this.colorModes();
    if (modes.length === 1) return;
    const i = modes.indexOf(this.mode());
    if (i === -1) return;
    this.mode.set(modes[(i + 1) % modes.length]);
  }
  protected async pickColor() {
    if (!this.supportsEyeDropper) return;
    const eyeDropper = new (window as any).EyeDropper();
    try {
      const result = await eyeDropper.open();
      this.init(result.sRGBHex);
    } catch (err) {}
  }
  protected async copyOutput() {
    const text = this.modeOutput();
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 3000);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  // Color Handlers
  private handleHex(val: string) {
    const obj = this.cc.parseHex(val);
    if (!obj) return;
    this.alpha.set(obj.alpha);
    this.syncFromRgb(this.cc.hexToRgb(obj.hex));
  }
  private handleRgb(val: string) {
    const obj = this.cc.parseRgb(val);
    if (!obj) return;
    this.alpha.set(obj.a);
    this.syncFromRgb(obj);
  }
  private handleHsl(val: string) {
    const obj = this.cc.parseHsl(val);
    if (!obj) return;
    this.alpha.set(obj.a);
    this.syncFromRgb(this.cc.hslToRgb(obj));
  }
}
