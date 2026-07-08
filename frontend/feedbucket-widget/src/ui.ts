import { captureScreenshot } from "./screenshot";
import { collectMetadata, getPageUrl } from "./metadata";
import { getConsoleBuffer } from "./console-capture";
import { submitFeedback } from "./api";
import { getStyles } from "./styles";
import { Annotator, type AnnotationResult } from "./annotator";
import { ScreenRecorder } from "./recorder";
import { LOGO_SVG } from "./logo";

type FeedbackType = "bug" | "idea" | "feature" | "question" | "other";
type ViewState = "form" | "success" | "error";

const FEEDBACK_TYPES: ReadonlyArray<{ readonly value: FeedbackType; readonly label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

const POSITION_KEY = "feedbucket:pos";
const NS = "http://www.w3.org/2000/svg";

interface IconSpec {
  readonly paths?: ReadonlyArray<string>;
  readonly circles?: ReadonlyArray<readonly [number, number, number]>;
  readonly stroke?: boolean;
  readonly size?: number;
}

function svgIcon(spec: IconSpec): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const size = spec.size ?? 20;
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (spec.stroke) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  } else {
    svg.setAttribute("fill", "currentColor");
  }
  for (const d of spec.paths ?? []) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  for (const [cx, cy, r] of spec.circles ?? []) {
    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    svg.appendChild(circle);
  }
  return svg;
}

class FeedbucketWidget {
  private readonly hostEl: HTMLElement;
  private readonly apiBase: string;
  private readonly embedKey: string;

  private isOpen = false;
  private selectedType: FeedbackType = "bug";
  private screenshot: Blob | null = null;
  private screenshotUrl: string | null = null;
  private recording: Blob | null = null;
  private capturing = false;
  private submitting = false;
  private busy = false;
  private viewState: ViewState = "form";
  private errorSubtitle: HTMLElement | null = null;

  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragMoved = false;
  private activePointerId: number | null = null;

  private readonly container: HTMLDivElement;
  private readonly logo: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly formView: HTMLDivElement;
  private readonly successView: HTMLDivElement;
  private readonly errorView: HTMLDivElement;
  private readonly messageInput: HTMLTextAreaElement;
  private readonly nameInput: HTMLInputElement;
  private readonly emailInput: HTMLInputElement;
  private readonly captureBtn: HTMLButtonElement;
  private readonly captureBtnLabel: HTMLSpanElement;
  private readonly previewWrap: HTMLDivElement;
  private readonly previewImg: HTMLImageElement;
  private readonly recordingBadge: HTMLDivElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly typeButtons: HTMLButtonElement[] = [];

  private readonly handleScreenshotLauncher = (): void => {
    void this.runScreenshotFlow();
  };
  private readonly handleRecordLauncher = (): void => {
    void this.runRecordFlow();
  };
  private readonly handleCommentLauncher = (): void => this.openPanel("other");

  private readonly handleCloseClick = (): void => {
    this.isOpen = false;
    this.syncPanel();
  };

  private readonly handleTypeSelect = (event: Event): void => {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLButtonElement)) return;
    const type = btn.dataset["type"];
    if (type === "bug" || type === "idea" || type === "feature" || type === "question" || type === "other") {
      this.setSelectedType(type);
    }
  };

  private readonly handleCaptureClick = async (): Promise<void> => {
    if (this.capturing) return;
    this.capturing = true;
    this.captureBtn.disabled = true;
    this.captureBtnLabel.textContent = "Capturing…";
    const blob = await captureScreenshot(this.hostEl);
    this.capturing = false;
    this.captureBtn.disabled = false;
    this.captureBtnLabel.textContent = "Capture screenshot";
    if (blob) this.setScreenshot(blob);
  };

  private readonly handleRemoveScreenshot = (): void => {
    if (this.screenshotUrl) {
      URL.revokeObjectURL(this.screenshotUrl);
      this.screenshotUrl = null;
    }
    this.screenshot = null;
    this.previewImg.src = "";
    this.previewWrap.hidden = true;
    this.captureBtn.style.display = "";
  };

  private readonly handleSubmitClick = async (): Promise<void> => {
    const message = this.messageInput.value.trim();
    if ((!message && !this.recording) || this.submitting) return;
    this.submitting = true;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Sending…";
    try {
      await submitFeedback({
        apiBase: this.apiBase,
        key: this.embedKey,
        type: this.selectedType,
        message: message || "Screen recording",
        pageUrl: getPageUrl(),
        reporterName: this.nameInput.value,
        reporterEmail: this.emailInput.value,
        metadata: collectMetadata(),
        consoleLogs: getConsoleBuffer(),
        screenshot: this.screenshot,
        recording: this.recording,
      });
      this.showView("success");
    } catch (error) {
      this.showError(error);
    } finally {
      this.submitting = false;
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Send Feedback";
    }
  };

  private readonly handleRetryClick = (): void => this.showView("form");
  private readonly handleDoneClick = (): void => {
    this.isOpen = false;
    this.syncPanel();
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) {
      this.isOpen = false;
      this.syncPanel();
    }
  };

  private readonly handleDragPointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.dragMoved = false;
    this.activePointerId = event.pointerId;
    const rect = this.container.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    this.logo.setPointerCapture(event.pointerId);
    this.container.classList.add("dragging");
    event.preventDefault();
  };

  private readonly handleDragPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    this.dragMoved = true;
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    const left = Math.max(8, Math.min(event.clientX - this.dragOffsetX, window.innerWidth - w - 8));
    const top = Math.max(8, Math.min(event.clientY - this.dragOffsetY, window.innerHeight - h - 8));
    this.setPosition(left, top);
    if (this.isOpen) this.positionPanel();
  };

  private readonly handleDragPointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    this.dragging = false;
    this.activePointerId = null;
    this.container.classList.remove("dragging");
    if (this.dragMoved) this.persistPosition();
  };

  constructor(hostEl: HTMLElement, apiBase: string, embedKey: string) {
    this.hostEl = hostEl;
    this.apiBase = apiBase;
    this.embedKey = embedKey;

    const shadow = hostEl.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = getStyles();
    shadow.appendChild(style);

    this.container = document.createElement("div");
    this.container.className = "widget";
    shadow.appendChild(this.container);

    const launcher = document.createElement("div");
    launcher.className = "launcher";
    launcher.setAttribute("role", "toolbar");
    launcher.setAttribute("aria-label", "Feedback");

    this.logo = document.createElement("div");
    this.logo.className = "launcher-logo";
    this.logo.title = "Drag to move";
    this.logo.setAttribute("aria-label", "Feedbucket — drag to move");
    this.logo.appendChild(this.buildLogoMark());
    const gripOverlay = svgIcon({
      size: 16,
      circles: [[9, 6, 1], [15, 6, 1], [9, 12, 1], [15, 12, 1], [9, 18, 1], [15, 18, 1]],
    });
    gripOverlay.classList.add("grip-overlay");
    this.logo.appendChild(gripOverlay);
    this.logo.addEventListener("pointerdown", this.handleDragPointerDown);
    this.logo.addEventListener("pointermove", this.handleDragPointerMove);
    this.logo.addEventListener("pointerup", this.handleDragPointerUp);
    this.logo.addEventListener("pointercancel", this.handleDragPointerUp);
    launcher.appendChild(this.logo);

    const divider = document.createElement("div");
    divider.className = "launcher-divider";
    launcher.appendChild(divider);

    launcher.appendChild(
      this.launcherButton("Screenshot & annotate", this.handleScreenshotLauncher, {
        paths: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],
        circles: [[12, 13, 4]],
        stroke: true,
      }),
    );
    launcher.appendChild(
      this.launcherButton("Record screen", this.handleRecordLauncher, {
        paths: ["M23 7l-7 5 7 5V7z", "M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"],
        stroke: true,
      }),
    );
    launcher.appendChild(
      this.launcherButton("Send feedback", this.handleCommentLauncher, {
        paths: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
        stroke: true,
      }),
    );
    this.container.appendChild(launcher);

    this.panel = document.createElement("div");
    this.panel.className = "panel";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-modal", "false");
    this.panel.setAttribute("aria-label", "Feedback panel");
    this.panel.setAttribute("aria-hidden", "true");
    this.container.appendChild(this.panel);

    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("span");
    title.className = "panel-title";
    title.textContent = "Share Feedback";
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.setAttribute("aria-label", "Close feedback panel");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", this.handleCloseClick);
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.panel.appendChild(header);

    this.formView = document.createElement("div");
    this.formView.className = "panel-body";

    const typeGroup = document.createElement("div");
    typeGroup.className = "type-group";
    typeGroup.setAttribute("role", "group");
    typeGroup.setAttribute("aria-label", "Feedback type");
    for (const item of FEEDBACK_TYPES) {
      const btn = document.createElement("button");
      btn.className = "type-btn" + (item.value === "bug" ? " selected" : "");
      btn.textContent = item.label;
      btn.dataset["type"] = item.value;
      btn.setAttribute("aria-pressed", item.value === "bug" ? "true" : "false");
      btn.addEventListener("click", this.handleTypeSelect);
      typeGroup.appendChild(btn);
      this.typeButtons.push(btn);
    }
    this.formView.appendChild(typeGroup);

    this.messageInput = document.createElement("textarea");
    this.messageInput.className = "message-textarea";
    this.messageInput.setAttribute("aria-label", "Feedback message");
    this.messageInput.placeholder = "Describe what you found or want to say…";
    this.messageInput.rows = 4;
    this.formView.appendChild(this.messageInput);

    this.recordingBadge = document.createElement("div");
    this.recordingBadge.className = "recording-badge";
    this.recordingBadge.hidden = true;
    const badgeText = document.createElement("span");
    badgeText.textContent = "Screen recording attached";
    const badgeRemove = document.createElement("button");
    badgeRemove.type = "button";
    badgeRemove.className = "recording-remove";
    badgeRemove.textContent = "×";
    badgeRemove.setAttribute("aria-label", "Remove recording");
    badgeRemove.addEventListener("click", this.handleRemoveRecording);
    this.recordingBadge.appendChild(badgeText);
    this.recordingBadge.appendChild(badgeRemove);
    this.formView.appendChild(this.recordingBadge);

    const screenshotSection = document.createElement("div");
    screenshotSection.className = "screenshot-section";
    this.captureBtn = document.createElement("button");
    this.captureBtn.className = "capture-btn";
    this.captureBtn.type = "button";
    this.captureBtn.appendChild(
      svgIcon({
        size: 16,
        paths: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],
        circles: [[12, 13, 4]],
        stroke: true,
      }),
    );
    this.captureBtnLabel = document.createElement("span");
    this.captureBtnLabel.textContent = "Capture screenshot";
    this.captureBtn.appendChild(this.captureBtnLabel);
    this.captureBtn.addEventListener("click", this.handleCaptureClick);
    screenshotSection.appendChild(this.captureBtn);

    this.previewWrap = document.createElement("div");
    this.previewWrap.className = "screenshot-preview-wrap";
    this.previewWrap.hidden = true;
    this.previewImg = document.createElement("img");
    this.previewImg.className = "screenshot-img";
    this.previewImg.alt = "Screenshot preview";
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-screenshot-btn";
    removeBtn.setAttribute("aria-label", "Remove screenshot");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", this.handleRemoveScreenshot);
    this.previewWrap.appendChild(this.previewImg);
    this.previewWrap.appendChild(removeBtn);
    screenshotSection.appendChild(this.previewWrap);
    this.formView.appendChild(screenshotSection);

    const optionalFields = document.createElement("div");
    optionalFields.className = "optional-fields";
    this.nameInput = document.createElement("input");
    this.nameInput.className = "text-input";
    this.nameInput.type = "text";
    this.nameInput.placeholder = "Your name (optional)";
    this.nameInput.autocomplete = "name";
    this.emailInput = document.createElement("input");
    this.emailInput.className = "text-input";
    this.emailInput.type = "email";
    this.emailInput.placeholder = "Your email (optional)";
    this.emailInput.autocomplete = "email";
    optionalFields.appendChild(this.nameInput);
    optionalFields.appendChild(this.emailInput);
    this.formView.appendChild(optionalFields);

    const actionsRow = document.createElement("div");
    actionsRow.className = "actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", this.handleCloseClick);
    this.submitBtn = document.createElement("button");
    this.submitBtn.className = "submit-btn";
    this.submitBtn.textContent = "Send Feedback";
    this.submitBtn.addEventListener("click", this.handleSubmitClick);
    actionsRow.appendChild(cancelBtn);
    actionsRow.appendChild(this.submitBtn);
    this.formView.appendChild(actionsRow);
    this.panel.appendChild(this.formView);

    this.successView = this.resultView("success", "✓", "Thanks for your feedback!", "We received your message and will look into it.", "Done", this.handleDoneClick);
    this.panel.appendChild(this.successView);
    this.errorView = this.resultView("error", "!", "Something went wrong", "Your feedback could not be submitted. Please try again.", "Try again", this.handleRetryClick);
    this.errorSubtitle = this.errorView.querySelector(".result-subtitle");
    this.panel.appendChild(this.errorView);

    document.addEventListener("keydown", this.handleKeydown);
    this.restorePosition();
  }

  private readonly handleRemoveRecording = (): void => {
    this.recording = null;
    this.recordingBadge.hidden = true;
  };

  private launcherButton(label: string, handler: () => void, icon: IconSpec): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "launcher-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.appendChild(svgIcon(icon));
    btn.addEventListener("click", handler);
    return btn;
  }

  private buildLogoMark(): Element {
    const parsed = new DOMParser().parseFromString(LOGO_SVG, "image/svg+xml").documentElement;
    const node = document.importNode(parsed, true);
    if (node instanceof Element) {
      node.setAttribute("width", "24");
      node.setAttribute("height", "24");
      node.classList.add("logo-mark");
      return node;
    }
    return document.createElement("span");
  }

  private resultView(
    kind: "success" | "error",
    iconText: string,
    titleText: string,
    subText: string,
    btnText: string,
    handler: () => void,
  ): HTMLDivElement {
    const view = document.createElement("div");
    view.className = "result-view";
    view.hidden = true;
    const icon = document.createElement("div");
    icon.className = `result-icon ${kind}-icon`;
    icon.textContent = iconText;
    const title = document.createElement("p");
    title.className = "result-title";
    title.textContent = titleText;
    const sub = document.createElement("p");
    sub.className = "result-subtitle";
    sub.textContent = subText;
    const btn = document.createElement("button");
    btn.className = kind === "success" ? "done-btn" : "retry-btn";
    btn.textContent = btnText;
    btn.addEventListener("click", handler);
    view.appendChild(icon);
    view.appendChild(title);
    view.appendChild(sub);
    view.appendChild(btn);
    return view;
  }

  private async runScreenshotFlow(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const shot = await captureScreenshot(this.hostEl);
      if (!shot) {
        this.openPanel("bug");
        return;
      }
      const annotator = new Annotator();
      const result = await annotator.run(shot);
      if (result) await this.submitAnnotated(result);
    } finally {
      this.busy = false;
    }
  }

  private async submitAnnotated(result: AnnotationResult): Promise<void> {
    const message = result.description ? `${result.title}\n\n${result.description}` : result.title;
    try {
      await submitFeedback({
        apiBase: this.apiBase,
        key: this.embedKey,
        type: result.type,
        message: message || "Visual feedback",
        pageUrl: getPageUrl(),
        reporterName: "",
        reporterEmail: "",
        metadata: collectMetadata(),
        consoleLogs: getConsoleBuffer(),
        screenshot: result.image,
        recording: null,
      });
      this.isOpen = true;
      this.showView("success");
      this.syncPanel();
    } catch (error) {
      this.isOpen = true;
      this.showError(error);
      this.syncPanel();
    }
  }

  private showError(err: unknown): void {
    const msg = err instanceof Error && err.message
      ? err.message
      : "Your feedback could not be submitted. Please try again.";
    if (this.errorSubtitle) this.errorSubtitle.textContent = msg.slice(0, 200);
    this.showView("error");
  }

  private async runRecordFlow(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const recorder = new ScreenRecorder();
      const video = await recorder.run();
      if (!video) return;
      this.recording = video;
      this.recordingBadge.hidden = false;
      this.openPanel("bug");
    } finally {
      this.busy = false;
    }
  }

  private setScreenshot(blob: Blob): void {
    if (this.screenshotUrl) URL.revokeObjectURL(this.screenshotUrl);
    this.screenshot = blob;
    this.screenshotUrl = URL.createObjectURL(blob);
    this.previewImg.src = this.screenshotUrl;
    this.previewWrap.hidden = false;
    this.captureBtn.style.display = "none";
  }

  private openPanel(type: FeedbackType): void {
    this.setSelectedType(type);
    if (this.viewState !== "form") this.showView("form");
    this.isOpen = true;
    this.syncPanel();
  }

  private syncPanel(): void {
    this.panel.setAttribute("aria-hidden", this.isOpen ? "false" : "true");
    if (this.isOpen) {
      this.positionPanel();
    } else if (this.viewState === "success") {
      this.resetForm();
      this.showView("form");
    }
  }

  private positionPanel(): void {
    const rect = this.container.getBoundingClientRect();
    this.panel.classList.toggle("flip-left", rect.left < window.innerWidth / 2);
    if (rect.top > window.innerHeight / 2) {
      this.panel.style.top = "auto";
      this.panel.style.bottom = "0";
    } else {
      this.panel.style.top = "0";
      this.panel.style.bottom = "auto";
    }
  }

  private setSelectedType(type: FeedbackType): void {
    this.selectedType = type;
    for (const btn of this.typeButtons) {
      const isSelected = btn.dataset["type"] === type;
      btn.classList.toggle("selected", isSelected);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }

  private showView(view: ViewState): void {
    this.viewState = view;
    this.formView.hidden = view !== "form";
    this.successView.hidden = view !== "success";
    this.errorView.hidden = view !== "error";
  }

  private resetForm(): void {
    this.messageInput.value = "";
    this.nameInput.value = "";
    this.emailInput.value = "";
    this.handleRemoveScreenshot();
    this.recording = null;
    this.recordingBadge.hidden = true;
    this.setSelectedType("bug");
  }

  private setPosition(left: number, top: number): void {
    this.container.classList.add("positioned");
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
    this.container.style.right = "auto";
    this.container.style.bottom = "auto";
  }

  private persistPosition(): void {
    try {
      const rect = this.container.getBoundingClientRect();
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
    } catch {
      return;
    }
  }

  private restorePosition(): void {
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
}

export function mountWidget(hostEl: HTMLElement, apiBase: string, embedKey: string): void {
  new FeedbucketWidget(hostEl, apiBase, embedKey);
}
