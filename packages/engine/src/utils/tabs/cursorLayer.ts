import type { CursorOptions } from "../../types/UI/cursorOptions";
import type { SelectionLayoutContext } from "../../selection/selectionRegions";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import { cursorGeometryAt } from "../../playback/cursorGeometry";
import {
  createCursorLine,
  createCursorOverlay,
  positionCursorLine,
  unwrapCursor,
  wrapForCursor,
} from "./cursorRenderer";

export class CursorLayer {
  private readonly cursorOptions?: CursorOptions;
  private svg?: SVGSVGElement;
  private context?: SelectionLayoutContext;
  private cursorMs?: number;
  private cursorWrapper?: HTMLElement;
  private cursorOverlay?: SVGSVGElement;
  private cursorLine?: SVGGElement;
  private cursorGeometry?: CursorGeometry;

  constructor(cursorOptions?: CursorOptions) {
    this.cursorOptions = cursorOptions;
  }

  sync(svg: SVGSVGElement, context: SelectionLayoutContext): void {
    this.svg = svg;
    this.context = context;
    this.refresh();
  }

  setCursor(ms: number | undefined): void {
    this.cursorMs = ms;

    if (ms === undefined) {
      this.teardown();
      return;
    }

    if (!this.cursorOverlay) {
      this.mount();
    }
    this.move();
  }

  teardown(): void {
    this.clearLine();
    this.cursorOverlay?.remove();
    this.cursorOverlay = undefined;
    if (this.cursorWrapper && this.svg) {
      unwrapCursor(this.cursorWrapper, this.svg);
    }
    this.cursorWrapper = undefined;
  }

  getGeometry(): CursorGeometry | undefined {
    return this.cursorGeometry;
  }

  getRect(): DOMRect | undefined {
    if (
      !this.cursorLine ||
      typeof this.cursorLine.getBoundingClientRect !== "function"
    ) {
      return undefined;
    }
    return this.cursorLine.getBoundingClientRect();
  }

  private refresh(): void {
    if (!this.cursorOverlay) {
      return;
    }
    if (!this.mount()) {
      return;
    }
    this.cursorLine?.remove();
    this.cursorLine = undefined;
    this.move();
  }

  private mount(): boolean {
    const svg = this.svg;
    if (!svg) {
      this.teardown();
      return false;
    }

    const wrapper = wrapForCursor(svg);
    if (!wrapper) {
      this.teardown();
      return false;
    }
    this.cursorWrapper = wrapper;

    if (!this.cursorOverlay || this.cursorOverlay.parentNode !== wrapper) {
      this.cursorLine?.remove();
      this.cursorLine = undefined;
      this.cursorOverlay?.remove();
      this.cursorOverlay = createCursorOverlay(wrapper);
    }

    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      this.cursorOverlay.setAttribute("viewBox", viewBox);
    }
    this.cursorOverlay.setAttribute(
      "preserveAspectRatio",
      svg.getAttribute("preserveAspectRatio") ?? "xMidYMid meet",
    );
    return true;
  }

  private move(): void {
    const overlay = this.cursorOverlay;
    if (!overlay || !this.context || this.cursorMs === undefined) {
      this.clearLine();
      return;
    }

    const geometry = cursorGeometryAt(this.cursorMs, this.context);
    if (!geometry) {
      this.clearLine();
      return;
    }

    if (!this.cursorLine) {
      this.cursorLine = createCursorLine(
        overlay,
        geometry.height,
        this.cursorOptions,
      );
    }
    positionCursorLine(this.cursorLine, geometry);
    this.cursorGeometry = geometry;
  }

  private clearLine(): void {
    this.cursorLine?.remove();
    this.cursorLine = undefined;
    this.cursorGeometry = undefined;
  }
}
