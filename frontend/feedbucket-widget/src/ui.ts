import { captureScreenshot } from "./screenshot";
import { collectMetadata, getPageUrl } from "./metadata";
import { getConsoleBuffer } from "./console-capture";
import { submitFeedback } from "./api";
import { getStyles } from "./styles";

type FeedbackType = "BUG" | "IDEA" | "QUESTION" | "OTHER";
type ViewState = "form" | "success" | "error";

const FEEDBACK_TYPES: ReadonlyArray<{ readonly value: FeedbackType; readonly label: string }> = [
  { value: "BUG", label: "Bug" },
  { value: "IDEA", label: "Idea" },
  { value: "QUESTION", label: "Question" },
  { value: "OTHER", label: "Other" },
];

function isFeedbackType(v: string | undefined): v is FeedbackType {
  return v === "BUG" || v === "IDEA" || v === "QUESTION" || v === "OTHER";
}

function createIcon(
  viewBox: string,
  pathData: string,
  extra?: { stroke?: string; circle?: [number, number, number] }
): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");

  if (extra?.stroke) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", extra.stroke);
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  } else {
    svg.setAttribute("fill", "currentColor");
  }

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);

  if (extra?.circle) {
    const [cx, cy, r] = extra.circle;
    const circle = document.createElementNS(ns, "circle");
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
  private selectedType: FeedbackType = "BUG";
  private screenshot: Blob | null = null;
  private screenshotUrl: string | null = null;
  private capturing = false;
  private submitting = false;
  private viewState: ViewState = "form";

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
  private readonly submitBtn: HTMLButtonElement;

  private readonly handleTriggerClick = (): void => {
    this.isOpen = !this.isOpen;
    this.syncPanel();
  };

  private readonly handleCloseClick = (): void => {
    this.isOpen = false;
    this.syncPanel();
  };

  private readonly handleCancelClick = (): void => {
    this.isOpen = false;
    this.syncPanel();
  };

  private readonly handleTypeSelect = (event: Event): void => {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLButtonElement)) return;
    const type = btn.dataset["type"];
    if (!isFeedbackType(type)) return;
    this.selectedType = type;
    const siblings = btn.parentElement?.querySelectorAll(".type-btn");
    if (!siblings) return;
    for (const sibling of siblings) {
      const isSelected = (sibling as HTMLElement).dataset["type"] === type;
      sibling.classList.toggle("selected", isSelected);
      sibling.setAttribute("aria-pressed", isSelected ? "true" : "false");
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

    if (blob) {
      if (this.screenshotUrl) URL.revokeObjectURL(this.screenshotUrl);
      this.screenshot = blob;
      this.screenshotUrl = URL.createObjectURL(blob);
      this.previewImg.src = this.screenshotUrl;
      this.previewWrap.hidden = false;
      this.captureBtn.style.display = "none";
    }
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
    if (!message || this.submitting) return;
    this.submitting = true;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Sending…";

    try {
      await submitFeedback({
        apiBase: this.apiBase,
        key: this.embedKey,
        type: this.selectedType,
        message,
        pageUrl: getPageUrl(),
        reporterName: this.nameInput.value,
        reporterEmail: this.emailInput.value,
        metadata: collectMetadata(),
        consoleLogs: getConsoleBuffer(),
        screenshot: this.screenshot,
      });
      this.showView("success");
    } catch {
      this.showView("error");
    } finally {
      this.submitting = false;
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Send Feedback";
    }
  };

  private readonly handleRetryClick = (): void => {
    this.showView("form");
  };

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

  constructor(hostEl: HTMLElement, apiBase: string, embedKey: string) {
    this.hostEl = hostEl;
    this.apiBase = apiBase;
    this.embedKey = embedKey;

    const shadow = hostEl.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = getStyles();
    shadow.appendChild(style);

    const container = document.createElement("div");
    container.className = "widget";
    shadow.appendChild(container);

    const triggerBtn = document.createElement("button");
    triggerBtn.className = "trigger-btn";
    triggerBtn.setAttribute("aria-label", "Open feedback panel");
    triggerBtn.setAttribute("aria-expanded", "false");
    const msgIcon = createIcon(
      "0 0 24 24",
      "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
    );
    const triggerLabel = document.createElement("span");
    triggerLabel.textContent = "Feedback";
    triggerBtn.appendChild(msgIcon);
    triggerBtn.appendChild(triggerLabel);
    triggerBtn.addEventListener("click", this.handleTriggerClick);
    container.appendChild(triggerBtn);

    this.panel = document.createElement("div");
    this.panel.className = "panel";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-modal", "false");
    this.panel.setAttribute("aria-label", "Feedback panel");
    this.panel.setAttribute("aria-hidden", "true");
    container.appendChild(this.panel);

    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("h2");
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
      btn.className = "type-btn" + (item.value === "BUG" ? " selected" : "");
      btn.textContent = item.label;
      btn.dataset["type"] = item.value;
      btn.setAttribute("aria-pressed", item.value === "BUG" ? "true" : "false");
      btn.addEventListener("click", this.handleTypeSelect);
      typeGroup.appendChild(btn);
    }
    this.formView.appendChild(typeGroup);

    this.messageInput = document.createElement("textarea");
    this.messageInput.className = "message-textarea";
    this.messageInput.setAttribute("aria-label", "Feedback message");
    this.messageInput.placeholder = "Describe what you found or want to say…";
    this.messageInput.rows = 4;
    this.formView.appendChild(this.messageInput);

    const screenshotSection = document.createElement("div");
    screenshotSection.className = "screenshot-section";

    this.captureBtn = document.createElement("button");
    this.captureBtn.className = "capture-btn";
    const camIcon = createIcon(
      "0 0 24 24",
      "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z",
      { stroke: "currentColor", circle: [12, 13, 4] }
    );
    this.captureBtnLabel = document.createElement("span");
    this.captureBtnLabel.textContent = "Capture screenshot";
    this.captureBtn.appendChild(camIcon);
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
    cancelBtn.addEventListener("click", this.handleCancelClick);
    this.submitBtn = document.createElement("button");
    this.submitBtn.className = "submit-btn";
    this.submitBtn.textContent = "Send Feedback";
    this.submitBtn.addEventListener("click", this.handleSubmitClick);
    actionsRow.appendChild(cancelBtn);
    actionsRow.appendChild(this.submitBtn);
    this.formView.appendChild(actionsRow);
    this.panel.appendChild(this.formView);

    this.successView = document.createElement("div");
    this.successView.className = "result-view";
    this.successView.hidden = true;
    const successIcon = document.createElement("div");
    successIcon.className = "result-icon success-icon";
    successIcon.textContent = "✓";
    const successTitle = document.createElement("p");
    successTitle.className = "result-title";
    successTitle.textContent = "Thanks for your feedback!";
    const successSub = document.createElement("p");
    successSub.className = "result-subtitle";
    successSub.textContent = "We received your message and will look into it.";
    const doneBtn = document.createElement("button");
    doneBtn.className = "done-btn";
    doneBtn.textContent = "Done";
    doneBtn.addEventListener("click", this.handleDoneClick);
    this.successView.appendChild(successIcon);
    this.successView.appendChild(successTitle);
    this.successView.appendChild(successSub);
    this.successView.appendChild(doneBtn);
    this.panel.appendChild(this.successView);

    this.errorView = document.createElement("div");
    this.errorView.className = "result-view";
    this.errorView.hidden = true;
    const errorIcon = document.createElement("div");
    errorIcon.className = "result-icon error-icon";
    errorIcon.textContent = "!";
    const errorTitle = document.createElement("p");
    errorTitle.className = "result-title";
    errorTitle.textContent = "Something went wrong";
    const errorSub = document.createElement("p");
    errorSub.className = "result-subtitle";
    errorSub.textContent = "Your feedback could not be submitted. Please try again.";
    const retryBtn = document.createElement("button");
    retryBtn.className = "retry-btn";
    retryBtn.textContent = "Try again";
    retryBtn.addEventListener("click", this.handleRetryClick);
    this.errorView.appendChild(errorIcon);
    this.errorView.appendChild(errorTitle);
    this.errorView.appendChild(errorSub);
    this.errorView.appendChild(retryBtn);
    this.panel.appendChild(this.errorView);

    document.addEventListener("keydown", this.handleKeydown);
  }

  private syncPanel(): void {
    const hidden = !this.isOpen;
    this.panel.setAttribute("aria-hidden", hidden ? "true" : "false");
    if (this.isOpen && this.viewState === "success") {
      this.resetForm();
      this.showView("form");
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
    this.selectedType = "BUG";
    const buttons = this.formView.querySelectorAll(".type-btn");
    for (const btn of buttons) {
      const el = btn as HTMLElement;
      const isSelected = el.dataset["type"] === "BUG";
      btn.classList.toggle("selected", isSelected);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }
}

export function mountWidget(
  hostEl: HTMLElement,
  apiBase: string,
  embedKey: string
): void {
  new FeedbucketWidget(hostEl, apiBase, embedKey);
}
