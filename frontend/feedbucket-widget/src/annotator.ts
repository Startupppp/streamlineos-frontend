import { aiAssistFeedback } from "./api";
import { getPageUrl } from "./metadata";
import { getNetworkLogs } from "./network-capture";
import { annotatorStyles } from "./annotator-styles";
import { NS, STROKE, type Tool, TYPES, TOOL_ICONS, icon } from "./annotator-icon-util";

export interface AnnotationResult {
  image: Blob;
  type: string;
  title: string;
  description: string;
}

interface Point {
  x: number;
  y: number;
}

interface Shape {
  tool: Exclude<Tool, "comment">;
  start: Point;
  end: Point;
  points: Point[];
}

interface Pin {
  x: number;
  y: number;
  index: number;
}


export class Annotator {
  private readonly overlay: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly rootEl: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pinLayer: HTMLDivElement;
  private readonly baseImage = new Image();

  private tool: Tool = "comment";
  private shapes: Shape[] = [];
  private pins: Pin[] = [];
  private drawing: Shape | null = null;
  private scale = 1;

  private resolveFn: ((r: AnnotationResult | null) => void) | null = null;
  private commentBox: HTMLDivElement | null = null;
  private selectedType = "bug";
  private aiEnhancing = false;
  private readonly aiAssistEnabled: boolean;
  private readonly apiBase: string;
  private readonly embedKey: string;

  constructor(opts: { aiAssistEnabled: boolean; apiBase: string; embedKey: string }) {
    this.aiAssistEnabled = opts.aiAssistEnabled;
    this.apiBase = opts.apiBase;
    this.embedKey = opts.embedKey;
    this.overlay = document.createElement("div");
    this.overlay.id = "feedbucket-annotator";
    this.overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;";
    this.shadow = this.overlay.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = annotatorStyles();
    this.shadow.appendChild(style);

    const root = document.createElement("div");
    root.className = "an-root";
    this.rootEl = root;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "an-canvas";
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.ctx = ctx;

    this.pinLayer = document.createElement("div");
    this.pinLayer.className = "an-pin-layer";

    const stage = document.createElement("div");
    stage.className = "an-stage";
    stage.appendChild(this.canvas);
    stage.appendChild(this.pinLayer);
    root.appendChild(stage);
    root.appendChild(this.buildToolbar());
    this.shadow.appendChild(root);
  }

  run(screenshot: Blob): Promise<AnnotationResult | null> {
    return new Promise((resolve) => {
      this.resolveFn = resolve;
      const url = URL.createObjectURL(screenshot);
      this.baseImage.onload = () => {
        URL.revokeObjectURL(url);
        this.layout();
        document.body.appendChild(this.overlay);
        this.attachCanvasEvents();
      };
      this.baseImage.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      this.baseImage.src = url;
    });
  }

  private layout(): void {
    const iw = this.baseImage.naturalWidth || 1;
    const ih = this.baseImage.naturalHeight || 1;
    this.canvas.width = iw;
    this.canvas.height = ih;
    const maxW = window.innerWidth - 40;
    const maxH = window.innerHeight - 120;
    this.scale = Math.min(1, maxW / iw, maxH / ih);
    this.canvas.style.width = `${iw * this.scale}px`;
    this.canvas.style.height = `${ih * this.scale}px`;
    this.pinLayer.style.width = `${iw * this.scale}px`;
    this.pinLayer.style.height = `${ih * this.scale}px`;
    this.redraw();
  }

  private buildToolbar(): HTMLDivElement {
    const bar = document.createElement("div");
    bar.className = "an-toolbar";
    const grip = document.createElement("div");
    grip.className = "an-grip";
    grip.appendChild(icon([], [[9, 6, 0.6], [15, 6, 0.6], [9, 12, 0.6], [15, 12, 0.6], [9, 18, 0.6], [15, 18, 0.6]]));
    bar.appendChild(grip);

    const tools: Tool[] = ["arrow", "rect", "rect-outline", "pen", "comment"];
    for (const t of tools) {
      const btn = document.createElement("button");
      btn.className = "an-tool" + (t === this.tool ? " active" : "");
      btn.type = "button";
      btn.title = t;
      btn.appendChild(TOOL_ICONS[t]());
      btn.addEventListener("click", () => this.selectTool(t, bar));
      bar.appendChild(btn);
    }
    const undo = document.createElement("button");
    undo.className = "an-tool";
    undo.type = "button";
    undo.title = "Undo";
    undo.appendChild(TOOL_ICONS.undo());
    undo.addEventListener("click", this.handleUndo);
    bar.appendChild(undo);

    const close = document.createElement("button");
    close.className = "an-tool an-close";
    close.type = "button";
    close.title = "Close";
    close.appendChild(TOOL_ICONS.close());
    close.addEventListener("click", this.handleClose);
    bar.appendChild(close);
    return bar;
  }

  private selectTool(t: Tool, bar: HTMLDivElement): void {
    this.tool = t;
    const buttons = bar.querySelectorAll(".an-tool");
    let idx = 0;
    const tools: Tool[] = ["arrow", "rect", "rect-outline", "pen", "comment"];
    for (const btn of buttons) {
      const toolAt = tools[idx];
      if (toolAt) btn.classList.toggle("active", toolAt === t);
      idx += 1;
    }
  }

  private readonly handleUndo = (): void => {
    if (this.shapes.length > 0) {
      this.shapes.pop();
    } else if (this.pins.length > 0) {
      this.pins.pop();
      this.renderPins();
    }
    this.redraw();
  };

  private readonly handleClose = (): void => {
    this.destroy();
    if (this.resolveFn) this.resolveFn(null);
  };

  private attachCanvasEvents(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
  }

  private toCanvasPoint(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / this.scale, y: (e.clientY - rect.top) / this.scale };
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.tool === "comment") {
      this.addPin(this.toCanvasPoint(e));
      return;
    }
    const p = this.toCanvasPoint(e);
    this.drawing = { tool: this.tool, start: p, end: p, points: [p] };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.drawing) return;
    const p = this.toCanvasPoint(e);
    this.drawing.end = p;
    if (this.drawing.tool === "pen") this.drawing.points.push(p);
    this.redraw();
  };

  private readonly onPointerUp = (): void => {
    if (this.drawing) {
      this.shapes.push(this.drawing);
      this.drawing = null;
      this.redraw();
    }
  };

  private addPin(p: Point): void {
    const pin: Pin = { x: p.x, y: p.y, index: this.pins.length + 1 };
    this.pins.push(pin);
    this.renderPins();
    this.openCommentBox(pin);
  }

  private renderPins(): void {
    this.pinLayer.replaceChildren();
    for (const pin of this.pins) {
      const el = document.createElement("div");
      el.className = "an-pin";
      el.textContent = String(pin.index);
      el.style.left = `${pin.x * this.scale}px`;
      el.style.top = `${pin.y * this.scale}px`;
      this.pinLayer.appendChild(el);
    }
  }

  private openCommentBox(pin: Pin): void {
    if (this.commentBox) this.commentBox.remove();
    const box = document.createElement("div");
    box.className = "an-comment-box";

    const typeRow = document.createElement("div");
    typeRow.className = "an-type-row";
    for (const t of TYPES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "an-chip" + (t.value === this.selectedType ? " active" : "");
      chip.textContent = t.label;
      chip.addEventListener("click", () => {
        this.selectedType = t.value;
        for (const c of typeRow.querySelectorAll(".an-chip")) c.classList.remove("active");
        chip.classList.add("active");
      });
      typeRow.appendChild(chip);
    }
    box.appendChild(typeRow);

    const title = document.createElement("input");
    title.className = "an-title";
    title.placeholder = "Title";
    box.appendChild(title);

    const desc = document.createElement("textarea");
    desc.className = "an-desc";
    desc.placeholder = "Describe in more detail if needed";
    desc.rows = 3;
    box.appendChild(desc);

    if (this.aiAssistEnabled) {
      const aiBtn = document.createElement("button");
      aiBtn.type = "button";
      aiBtn.className = "an-ai-btn";
      aiBtn.textContent = "✨ Enhance with AI";
      const aiNote = document.createElement("span");
      aiNote.className = "an-ai-note";
      aiNote.hidden = true;
      aiBtn.addEventListener("click", () => {
        void this.runAiEnhance(aiBtn, aiNote, typeRow, title, desc);
      });
      box.appendChild(aiBtn);
      box.appendChild(aiNote);
    }

    const footer = document.createElement("div");
    footer.className = "an-box-footer";
    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "an-submit";
    submit.textContent = "Submit";
    submit.addEventListener("click", () => {
      const t = title.value.trim();
      const d = desc.value.trim();
      if (!t && !d) {
        title.focus();
        return;
      }
      void this.finish(t || d, d);
    });
    footer.appendChild(submit);
    box.appendChild(footer);

    this.rootEl.appendChild(box);
    this.commentBox = box;
    this.positionCommentBox(box, pin);
    title.focus();
  }

  private positionCommentBox(box: HTMLDivElement, pin: Pin): void {
    const canvasRect = this.canvas.getBoundingClientRect();
    const px = canvasRect.left + pin.x * this.scale;
    const py = canvasRect.top + pin.y * this.scale;
    const bw = box.offsetWidth || 288;
    const bh = box.offsetHeight || 240;
    const m = 12;
    let left = px + 16;
    if (left + bw > window.innerWidth - m) left = px - bw - 16;
    left = Math.max(m, Math.min(left, window.innerWidth - bw - m));
    let top = py + 16;
    if (top + bh > window.innerHeight - m) top = py - bh - 16;
    top = Math.max(m, Math.min(top, window.innerHeight - bh - m));
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
  }

  private async finish(title: string, description: string): Promise<void> {
    const blob = await this.exportImage();
    this.destroy();
    if (this.resolveFn && blob) {
      this.resolveFn({
        image: blob,
        type: this.selectedType,
        title,
        description,
      });
    } else if (this.resolveFn) {
      this.resolveFn(null);
    }
  }

  private exportImage(): Promise<Blob | null> {
    this.renderPinsToCanvas();
    return new Promise((resolve) => {
      this.canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82);
    });
  }

  private exportCurrentImage(): Promise<Blob | null> {
    this.renderPinsToCanvas();
    return new Promise((resolve) => {
      this.canvas.toBlob((b) => {
        this.redraw();
        resolve(b);
      }, "image/jpeg", 0.82);
    });
  }

  private async runAiEnhance(
    btn: HTMLButtonElement,
    note: HTMLSpanElement,
    typeRow: HTMLDivElement,
    title: HTMLInputElement,
    desc: HTMLTextAreaElement,
  ): Promise<void> {
    if (this.aiEnhancing) return;
    this.aiEnhancing = true;
    btn.disabled = true;
    btn.textContent = "✨ Thinking…";
    note.hidden = true;
    const image = await this.exportCurrentImage();
    const t = title.value.trim();
    const d = desc.value.trim();
    const message = t && d ? `${t}\n\n${d}` : t || d;
    const result = await aiAssistFeedback({
      apiBase: this.apiBase,
      key: this.embedKey,
      type: this.selectedType,
      message,
      pageUrl: getPageUrl(),
      screenshot: image,
      networkLogs: getNetworkLogs(),
    });
    this.aiEnhancing = false;
    btn.disabled = false;
    btn.textContent = "✨ Enhance with AI";
    if ("kind" in result) {
      if (result.kind === "feature_off") {
        btn.hidden = true;
        return;
      }
      note.hidden = false;
      note.textContent =
        result.kind === "credits_exhausted"
          ? "AI credits exhausted"
          : result.kind === "rate_limited"
            ? "Too many requests, try again in a moment"
            : "AI is unavailable right now";
      return;
    }
    const valid: ReadonlyArray<string> = ["bug", "idea", "feature", "question", "other"];
    if (valid.includes(result.suggestedType)) {
      this.selectedType = result.suggestedType;
      const chips = typeRow.querySelectorAll(".an-chip");
      let i = 0;
      for (const chip of chips) {
        const tv = TYPES[i]?.value;
        chip.classList.toggle("active", tv === this.selectedType);
        i += 1;
      }
    }
    title.value = result.title;
    desc.value = result.description;
  }

  private renderPinsToCanvas(): void {
    this.redraw();
    for (const pin of this.pins) {
      this.ctx.fillStyle = STROKE;
      this.ctx.beginPath();
      this.ctx.arc(pin.x, pin.y, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 14px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(String(pin.index), pin.x, pin.y);
    }
  }

  private redraw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = STROKE;
    ctx.fillStyle = "rgba(239,68,68,0.18)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = this.drawing ? [...this.shapes, this.drawing] : this.shapes;
    for (const s of all) this.drawShape(s);
  }

  private drawShape(s: Shape): void {
    const ctx = this.ctx;
    if (s.tool === "pen") {
      ctx.beginPath();
      const first = s.points[0];
      if (!first) return;
      ctx.moveTo(first.x, first.y);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }
    if (s.tool === "rect" || s.tool === "rect-outline") {
      const x = Math.min(s.start.x, s.end.x);
      const y = Math.min(s.start.y, s.end.y);
      const w = Math.abs(s.end.x - s.start.x);
      const h = Math.abs(s.end.y - s.start.y);
      if (s.tool === "rect") ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s.start.x, s.start.y);
    ctx.lineTo(s.end.x, s.end.y);
    ctx.stroke();
    const angle = Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x);
    const head = 14;
    ctx.beginPath();
    ctx.moveTo(s.end.x, s.end.y);
    ctx.lineTo(s.end.x - head * Math.cos(angle - Math.PI / 6), s.end.y - head * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(s.end.x, s.end.y);
    ctx.lineTo(s.end.x - head * Math.cos(angle + Math.PI / 6), s.end.y - head * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  private destroy(): void {
    this.overlay.remove();
  }

}
