import { captureScreenshot, warmScreenshotCache } from "./screenshot";
import { collectMetadata, getPageUrl } from "./metadata";
import { getConsoleBuffer } from "./console-capture";
import { getNetworkLogs } from "./network-capture";
import { submitFeedback, aiAssistFeedback, unwrapEnvelope } from "./api";
import { getStyles } from "./styles";
import { Annotator, type AnnotationResult } from "./annotator";
import { ScreenRecorder } from "./recorder";
import { type FeedbackType, type ViewState } from "./ui-icon-util";
import { DragManager } from "./ui-drag";
import { buildLauncher } from "./ui-launcher-builder";
import { buildFeedbackPanel } from "./ui-panel-builder";

class FeedbucketWidget {
  private readonly hostEl: HTMLElement;
  private readonly apiBase: string;
  private readonly embedKey: string;
  private readonly aiAssistEnabled: boolean;

  private isOpen = false;
  private selectedType: FeedbackType = "bug";
  private screenshot: Blob | null = null;
  private screenshotUrl: string | null = null;
  private recording: Blob | null = null;
  private capturing = false;
  private pendingCapture: Promise<Blob | null> | null = null;
  private hoverTimer: number | null = null;
  private submitting = false;
  private aiAssisting = false;
  private busy = false;
  private viewState: ViewState = "form";
  private errorSubtitle: HTMLElement | null = null;

  private readonly container: HTMLDivElement;
  private readonly shadowRoot: ShadowRoot;
  private readonly panel: HTMLDivElement;
  private readonly formView: HTMLDivElement;
  private readonly successView: HTMLDivElement;
  private readonly errorView: HTMLDivElement;
  private readonly titleInput: HTMLInputElement;
  private readonly messageInput: HTMLTextAreaElement;
  private readonly nameInput: HTMLInputElement;
  private readonly emailInput: HTMLInputElement;
  private readonly captureBtn: HTMLButtonElement;
  private readonly captureBtnLabel: HTMLSpanElement;
  private readonly previewWrap: HTMLDivElement;
  private readonly previewImg: HTMLImageElement;
  private readonly recordingBadge: HTMLDivElement;
  private readonly submitBtn: HTMLButtonElement;
  private aiBtn: HTMLButtonElement | null = null;
  private aiNote: HTMLSpanElement | null = null;
  private readonly typeButtons: HTMLButtonElement[] = [];

  private readonly drag: DragManager;

  private readonly handleScreenshotLauncher = (): void => {
    void this.runScreenshotFlow();
  };
  private readonly handleLauncherHover = (): void => {
    if (
      this.drag.isDragging() ||
      this.hoverTimer !== null ||
      this.pendingCapture ||
      this.screenshot ||
      this.busy ||
      this.capturing ||
      this.aiAssisting
    ) {
      return;
    }
    this.hoverTimer = window.setTimeout(() => {
      this.hoverTimer = null;
      if (
        this.drag.isDragging() ||
        this.pendingCapture ||
        this.screenshot ||
        this.busy ||
        this.capturing
      ) {
        return;
      }
      this.pendingCapture = captureScreenshot(this.hostEl);
    }, 180);
  };
  private readonly handleLauncherLeave = (): void => {
    if (this.drag.isDragging()) return;
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.pendingCapture = null;
  };

  private cancelHoverPrefetch(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }
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
    if (
      type === "bug" ||
      type === "idea" ||
      type === "feature" ||
      type === "question" ||
      type === "other"
    ) {
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
    const titleVal = this.titleInput.value.trim();
    const descVal = this.messageInput.value.trim();
    const message =
      titleVal && descVal ? `${titleVal}\n\n${descVal}` : titleVal || descVal;
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
        networkLogs: getNetworkLogs(),
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

  private readonly handleViewportChange = (): void => {
    if (this.isOpen) this.positionPanel();
  };

  private readonly handleAiAssistClick = (): void => {
    void this.runAiAssist();
  };

  private readonly handleRemoveRecording = (): void => {
    this.recording = null;
    this.recordingBadge.hidden = true;
  };

  constructor(
    hostEl: HTMLElement,
    apiBase: string,
    embedKey: string,
    aiAssistEnabled: boolean,
  ) {
    this.hostEl = hostEl;
    this.apiBase = apiBase;
    this.embedKey = embedKey;
    this.aiAssistEnabled = aiAssistEnabled;

    const shadow = hostEl.attachShadow({ mode: "open" });
    this.shadowRoot = shadow;
    const style = document.createElement("style");
    style.textContent = getStyles();
    shadow.appendChild(style);

    this.container = document.createElement("div");
    this.container.className = "widget";
    shadow.appendChild(this.container);

    const { launcher, logo } = buildLauncher({
      onScreenshot: this.handleScreenshotLauncher,
      onRecord: this.handleRecordLauncher,
      onComment: this.handleCommentLauncher,
      onHoverEnter: this.handleLauncherHover,
      onHoverLeave: this.handleLauncherLeave,
    });
    this.container.appendChild(launcher);

    this.drag = new DragManager(this.container, {
      onDragStart: () => this.cancelHoverPrefetch(),
      onPositionChange: () => { if (this.isOpen) this.positionPanel(); },
    });
    this.drag.init(logo);

    const panelRefs = buildFeedbackPanel(this.aiAssistEnabled, {
      onClose: this.handleCloseClick,
      onTypeSelect: this.handleTypeSelect,
      onCaptureClick: this.handleCaptureClick,
      onRemoveScreenshot: this.handleRemoveScreenshot,
      onRemoveRecording: this.handleRemoveRecording,
      onSubmitClick: this.handleSubmitClick,
      onAiAssistClick: this.handleAiAssistClick,
      onRetryClick: this.handleRetryClick,
      onDoneClick: this.handleDoneClick,
    });
    this.panel = panelRefs.panel;
    this.formView = panelRefs.formRefs.formView;
    this.titleInput = panelRefs.formRefs.titleInput;
    this.messageInput = panelRefs.formRefs.messageInput;
    this.nameInput = panelRefs.formRefs.nameInput;
    this.emailInput = panelRefs.formRefs.emailInput;
    this.captureBtn = panelRefs.formRefs.captureBtn;
    this.captureBtnLabel = panelRefs.formRefs.captureBtnLabel;
    this.previewWrap = panelRefs.formRefs.previewWrap;
    this.previewImg = panelRefs.formRefs.previewImg;
    this.recordingBadge = panelRefs.formRefs.recordingBadge;
    this.submitBtn = panelRefs.formRefs.submitBtn;
    this.aiBtn = panelRefs.formRefs.aiBtn;
    this.aiNote = panelRefs.formRefs.aiNote;
    panelRefs.formRefs.typeButtons.forEach((b) => this.typeButtons.push(b));
    this.successView = panelRefs.successView;
    this.errorView = panelRefs.errorView;
    this.errorSubtitle = panelRefs.errorSubtitle;
    this.container.appendChild(this.panel);

    document.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("resize", this.handleViewportChange);
    window.addEventListener("orientationchange", this.handleViewportChange);
  }

  private async runAiAssist(): Promise<void> {
    if (this.aiAssisting || !this.aiBtn) return;
    this.aiAssisting = true;
    this.aiBtn.disabled = true;
    this.aiBtn.textContent = "✨ Thinking…";
    if (this.aiNote) this.aiNote.hidden = true;

    let screenshot = this.screenshot;
    if (!screenshot) {
      const captured = this.pendingCapture
        ? await this.pendingCapture
        : await captureScreenshot(this.hostEl);
      if (captured) {
        this.setScreenshot(captured);
        screenshot = captured;
      }
    }

    const titleVal = this.titleInput.value.trim();
    const descVal = this.messageInput.value.trim();
    const message =
      titleVal && descVal ? `${titleVal}\n\n${descVal}` : titleVal || descVal;

    const result = await aiAssistFeedback({
      apiBase: this.apiBase,
      key: this.embedKey,
      type: this.selectedType,
      message,
      pageUrl: getPageUrl(),
      screenshot,
      networkLogs: getNetworkLogs(),
    });

    this.aiAssisting = false;
    this.aiBtn.disabled = false;
    this.aiBtn.textContent = "✨ Enhance with AI";

    if ("kind" in result) {
      if (result.kind === "feature_off") {
        this.aiBtn.hidden = true;
        return;
      }
      if (this.aiNote) {
        const note = result.kind === "credits_exhausted" ? "AI credits exhausted"
          : result.kind === "rate_limited" ? "Too many requests, try again in a moment"
          : "AI is unavailable right now";
        this.aiNote.hidden = false;
        this.aiNote.textContent = note;
      }
      return;
    }

    const suggested = result.suggestedType;
    if (["bug", "idea", "feature", "question", "other"].includes(suggested))
      this.setSelectedType(suggested as FeedbackType);
    this.titleInput.value = result.title;
    this.messageInput.value = result.description;
    if (this.aiNote) this.aiNote.hidden = true;
  }

  private async runScreenshotFlow(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const shot = this.pendingCapture
        ? await this.pendingCapture
        : await captureScreenshot(this.hostEl);
      this.pendingCapture = null;
      if (!shot) {
        this.openPanel("bug");
        return;
      }
      const annotator = new Annotator({
        aiAssistEnabled: this.aiAssistEnabled,
        apiBase: this.apiBase,
        embedKey: this.embedKey,
      });
      const result = await annotator.run(shot);
      if (result) await this.submitAnnotated(result);
    } finally {
      this.busy = false;
    }
  }

  private async submitAnnotated(result: AnnotationResult): Promise<void> {
    const message = result.description
      ? `${result.title}\n\n${result.description}`
      : result.title;
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
        networkLogs: getNetworkLogs(),
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
    const msg =
      err instanceof Error && err.message
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
    const wasOpen = this.isOpen;
    this.setSelectedType(type);
    if (this.viewState !== "form") this.showView("form");
    this.isOpen = true;
    if (!wasOpen && !this.screenshot) {
      this.pendingCapture = captureScreenshot(this.hostEl);
    }
    this.syncPanel();
  }

  private syncPanel(): void {
    this.panel.setAttribute("aria-hidden", this.isOpen ? "false" : "true");
    if (this.isOpen) {
      this.positionPanel();
    } else {
      this.container.classList.remove("panel-open");
      this.panel.classList.remove("is-sheet");
      if (this.panel.parentElement !== this.container) {
        this.container.appendChild(this.panel);
      }
      if (this.viewState === "success") {
        this.resetForm();
        this.showView("form");
      }
    }
  }

  private positionPanel(): void {
    if (window.matchMedia("(max-width: 480px)").matches) {
      if (this.panel.parentNode !== this.shadowRoot) {
        this.shadowRoot.appendChild(this.panel);
      }
      this.panel.classList.add("is-sheet");
      this.panel.classList.remove("flip-left");
      this.panel.style.top = "";
      this.panel.style.bottom = "";
      this.container.classList.add("panel-open");
      return;
    }

    if (this.panel.parentElement !== this.container) {
      this.container.appendChild(this.panel);
    }
    this.panel.classList.remove("is-sheet");
    this.container.classList.remove("panel-open");
    const rect = this.container.getBoundingClientRect();
    this.panel.classList.toggle("flip-left", rect.left < window.innerWidth / 2);
    const isBottom = rect.top > window.innerHeight / 2;
    this.panel.style.top = isBottom ? "auto" : "0";
    this.panel.style.bottom = isBottom ? "0" : "auto";
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
    this.titleInput.value = "";
    this.messageInput.value = "";
    this.nameInput.value = "";
    this.emailInput.value = "";
    this.handleRemoveScreenshot();
    this.recording = null;
    this.recordingBadge.hidden = true;
    if (this.aiNote) this.aiNote.hidden = true;
    this.setSelectedType("bug");
  }
}

export function mountWidget(
  hostEl: HTMLElement,
  apiBase: string,
  embedKey: string,
): void {
  void bootstrapWidget(hostEl, apiBase, embedKey);
  setTimeout(warmScreenshotCache, 2000);
}

async function bootstrapWidget(
  hostEl: HTMLElement,
  apiBase: string,
  embedKey: string,
): Promise<void> {
  let aiAssistEnabled = false;
  try {
    const res = await fetch(`${apiBase}/public/feedbucket/${embedKey}/config`);
    if (res.ok) {
      const data: unknown = unwrapEnvelope(await res.json());
      if (
        typeof data === "object" &&
        data !== null &&
        "aiAssistEnabled" in data &&
        (data as Record<string, unknown>)["aiAssistEnabled"] === true
      ) {
        aiAssistEnabled = true;
      }
    }
  } catch {
  }
  new FeedbucketWidget(hostEl, apiBase, embedKey, aiAssistEnabled);
}
