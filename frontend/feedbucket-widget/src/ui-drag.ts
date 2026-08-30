import { POSITION_KEY } from "./ui-icon-util";

interface DragCallbacks {
  onDragStart?(): void;
  onPositionChange(): void;
}

export class DragManager {
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragMoved = false;
  private activePointerId: number | null = null;
  private dragWidth = 0;
  private dragHeight = 0;
  private dragBaseLeft = 0;
  private dragBaseTop = 0;
  private dragCurrentLeft = 0;
  private dragCurrentTop = 0;
  private pendingDragLeft: number | null = null;
  private pendingDragTop: number | null = null;
  private dragRafId: number | null = null;

  private logo: HTMLElement | null = null;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly callbacks: DragCallbacks,
  ) {}

  init(logo: HTMLElement): void {
    this.logo = logo;
    logo.addEventListener("pointerdown", this.onPointerDown);
    logo.addEventListener("pointermove", this.onPointerMove);
    logo.addEventListener("pointerup", this.onPointerUp);
    logo.addEventListener("pointercancel", this.onPointerUp);
    this.restorePosition();
  }

  isDragging(): boolean {
    return this.dragging;
  }

  setPosition(left: number, top: number): void {
    this.container.classList.add("positioned");
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
    this.container.style.right = "auto";
    this.container.style.bottom = "auto";
    this.container.style.transform = "";
  }

  restorePosition(): void {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(POSITION_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "left" in parsed &&
        "top" in parsed &&
        typeof (parsed as { left: unknown }).left === "number" &&
        typeof (parsed as { top: unknown }).top === "number"
      ) {
        const left = (parsed as { left: number }).left;
        const top = (parsed as { top: number }).top;
        const w = this.container.offsetWidth || 52;
        const h = this.container.offsetHeight || 200;
        this.setPosition(
          Math.max(8, Math.min(left, window.innerWidth - w - 8)),
          Math.max(8, Math.min(top, window.innerHeight - h - 8)),
        );
      }
    } catch {
      return;
    }
  }

  private persistPosition(): void {
    try {
      const rect = this.container.getBoundingClientRect();
      window.localStorage.setItem(
        POSITION_KEY,
        JSON.stringify({ left: rect.left, top: rect.top }),
      );
    } catch {
      return;
    }
  }

  private readonly flushDragPosition = (): void => {
    this.dragRafId = null;
    if (this.pendingDragLeft === null || this.pendingDragTop === null) return;
    const left = this.pendingDragLeft;
    const top = this.pendingDragTop;
    this.pendingDragLeft = null;
    this.pendingDragTop = null;
    this.dragCurrentLeft = left;
    this.dragCurrentTop = top;
    const dx = left - this.dragBaseLeft;
    const dy = top - this.dragBaseTop;
    this.container.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    this.callbacks.onPositionChange();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    this.callbacks.onDragStart?.();
    this.dragging = true;
    this.dragMoved = false;
    this.activePointerId = event.pointerId;
    const rect = this.container.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    this.dragWidth = rect.width;
    this.dragHeight = rect.height;
    this.dragBaseLeft = rect.left;
    this.dragBaseTop = rect.top;
    this.dragCurrentLeft = rect.left;
    this.dragCurrentTop = rect.top;
    this.pendingDragLeft = null;
    this.pendingDragTop = null;
    this.container.classList.add("positioned", "dragging");
    this.container.style.left = `${rect.left}px`;
    this.container.style.top = `${rect.top}px`;
    this.container.style.right = "auto";
    this.container.style.bottom = "auto";
    this.container.style.transform = "translate3d(0,0,0)";
    this.logo?.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    this.dragMoved = true;
    const left = Math.max(
      8,
      Math.min(
        event.clientX - this.dragOffsetX,
        window.innerWidth - this.dragWidth - 8,
      ),
    );
    const top = Math.max(
      8,
      Math.min(
        event.clientY - this.dragOffsetY,
        window.innerHeight - this.dragHeight - 8,
      ),
    );
    this.pendingDragLeft = left;
    this.pendingDragTop = top;
    if (this.dragRafId === null) {
      this.dragRafId = requestAnimationFrame(this.flushDragPosition);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    if (this.pendingDragLeft !== null && this.pendingDragTop !== null) {
      this.dragCurrentLeft = this.pendingDragLeft;
      this.dragCurrentTop = this.pendingDragTop;
      this.pendingDragLeft = null;
      this.pendingDragTop = null;
    }
    this.dragging = false;
    this.activePointerId = null;
    this.container.classList.remove("dragging");
    this.setPosition(this.dragCurrentLeft, this.dragCurrentTop);
    this.callbacks.onPositionChange();
    if (this.dragMoved) this.persistPosition();
  };
}
