import { svgIcon, FEEDBACK_TYPES } from "./ui-icon-util";

export interface FormRefs {
  formView: HTMLDivElement;
  titleInput: HTMLInputElement;
  messageInput: HTMLTextAreaElement;
  nameInput: HTMLInputElement;
  emailInput: HTMLInputElement;
  captureBtn: HTMLButtonElement;
  captureBtnLabel: HTMLSpanElement;
  previewWrap: HTMLDivElement;
  previewImg: HTMLImageElement;
  recordingBadge: HTMLDivElement;
  submitBtn: HTMLButtonElement;
  aiBtn: HTMLButtonElement | null;
  aiNote: HTMLSpanElement | null;
  typeButtons: HTMLButtonElement[];
}

export interface PanelRefs {
  panel: HTMLDivElement;
  formRefs: FormRefs;
  successView: HTMLDivElement;
  errorView: HTMLDivElement;
  errorSubtitle: HTMLElement | null;
}

export interface PanelCallbacks {
  onClose(): void;
  onTypeSelect(event: Event): void;
  onCaptureClick(): void;
  onRemoveScreenshot(): void;
  onRemoveRecording(): void;
  onSubmitClick(): void;
  onAiAssistClick(): void;
  onRetryClick(): void;
  onDoneClick(): void;
}

export function buildResultView(
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
  const iconEl = document.createElement("div");
  iconEl.className = `result-icon ${kind}-icon`;
  iconEl.textContent = iconText;
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
  view.appendChild(iconEl);
  view.appendChild(title);
  view.appendChild(sub);
  view.appendChild(btn);
  return view;
}

export function buildFeedbackPanel(
  aiAssistEnabled: boolean,
  callbacks: PanelCallbacks,
): PanelRefs {
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", "Feedback panel");
  panel.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.className = "panel-header";
  const headerTitle = document.createElement("span");
  headerTitle.className = "panel-title";
  headerTitle.textContent = "Share Feedback";
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.setAttribute("aria-label", "Close feedback panel");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", callbacks.onClose);
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const formView = document.createElement("div");
  formView.className = "panel-body";

  const typeGroup = document.createElement("div");
  typeGroup.className = "type-group";
  typeGroup.setAttribute("role", "group");
  typeGroup.setAttribute("aria-label", "Feedback type");
  const typeButtons: HTMLButtonElement[] = [];
  for (const item of FEEDBACK_TYPES) {
    const btn = document.createElement("button");
    btn.className = "type-btn" + (item.value === "bug" ? " selected" : "");
    btn.textContent = item.label;
    btn.dataset["type"] = item.value;
    btn.setAttribute("aria-pressed", item.value === "bug" ? "true" : "false");
    btn.addEventListener("click", callbacks.onTypeSelect);
    typeGroup.appendChild(btn);
    typeButtons.push(btn);
  }
  formView.appendChild(typeGroup);

  const titleInput = document.createElement("input");
  titleInput.className = "text-input";
  titleInput.type = "text";
  titleInput.placeholder = "Title (optional)";
  titleInput.setAttribute("aria-label", "Feedback title");
  formView.appendChild(titleInput);

  const messageInput = document.createElement("textarea");
  messageInput.className = "message-textarea";
  messageInput.setAttribute("aria-label", "Feedback message");
  messageInput.placeholder = "Describe what you found or want to say…";
  messageInput.rows = 4;
  formView.appendChild(messageInput);

  const recordingBadge = document.createElement("div");
  recordingBadge.className = "recording-badge";
  recordingBadge.hidden = true;
  const badgeText = document.createElement("span");
  badgeText.textContent = "Screen recording attached";
  const badgeRemove = document.createElement("button");
  badgeRemove.type = "button";
  badgeRemove.className = "recording-remove";
  badgeRemove.textContent = "×";
  badgeRemove.setAttribute("aria-label", "Remove recording");
  badgeRemove.addEventListener("click", callbacks.onRemoveRecording);
  recordingBadge.appendChild(badgeText);
  recordingBadge.appendChild(badgeRemove);
  formView.appendChild(recordingBadge);

  const screenshotSection = document.createElement("div");
  screenshotSection.className = "screenshot-section";
  const captureBtn = document.createElement("button");
  captureBtn.className = "capture-btn";
  captureBtn.type = "button";
  captureBtn.appendChild(
    svgIcon({
      size: 16,
      paths: [
        "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z",
      ],
      circles: [[12, 13, 4]],
      stroke: true,
    }),
  );
  const captureBtnLabel = document.createElement("span");
  captureBtnLabel.textContent = "Capture screenshot";
  captureBtn.appendChild(captureBtnLabel);
  captureBtn.addEventListener("click", callbacks.onCaptureClick);
  screenshotSection.appendChild(captureBtn);

  const previewWrap = document.createElement("div");
  previewWrap.className = "screenshot-preview-wrap";
  previewWrap.hidden = true;
  const previewImg = document.createElement("img");
  previewImg.className = "screenshot-img";
  previewImg.alt = "Screenshot preview";
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-screenshot-btn";
  removeBtn.setAttribute("aria-label", "Remove screenshot");
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", callbacks.onRemoveScreenshot);
  previewWrap.appendChild(previewImg);
  previewWrap.appendChild(removeBtn);
  screenshotSection.appendChild(previewWrap);
  formView.appendChild(screenshotSection);

  const optionalFields = document.createElement("div");
  optionalFields.className = "optional-fields";
  const nameInput = document.createElement("input");
  nameInput.className = "text-input";
  nameInput.type = "text";
  nameInput.placeholder = "Your name (optional)";
  nameInput.autocomplete = "name";
  const emailInput = document.createElement("input");
  emailInput.className = "text-input";
  emailInput.type = "email";
  emailInput.placeholder = "Your email (optional)";
  emailInput.autocomplete = "email";
  optionalFields.appendChild(nameInput);
  optionalFields.appendChild(emailInput);
  formView.appendChild(optionalFields);

  let aiBtn: HTMLButtonElement | null = null;
  let aiNote: HTMLSpanElement | null = null;
  if (aiAssistEnabled) {
    const aiRow = document.createElement("div");
    aiRow.className = "ai-row";
    const aiBtnEl = document.createElement("button");
    aiBtnEl.className = "ai-btn";
    aiBtnEl.type = "button";
    aiBtnEl.setAttribute("aria-label", "Enhance with AI");
    aiBtnEl.textContent = "✨ Enhance with AI";
    aiBtnEl.addEventListener("click", callbacks.onAiAssistClick);
    aiRow.appendChild(aiBtnEl);
    const aiNoteEl = document.createElement("span");
    aiNoteEl.className = "ai-note";
    aiNoteEl.hidden = true;
    aiRow.appendChild(aiNoteEl);
    formView.appendChild(aiRow);
    aiBtn = aiBtnEl;
    aiNote = aiNoteEl;
  }

  const actionsRow = document.createElement("div");
  actionsRow.className = "actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", callbacks.onClose);
  const submitBtn = document.createElement("button");
  submitBtn.className = "submit-btn";
  submitBtn.textContent = "Send Feedback";
  submitBtn.addEventListener("click", callbacks.onSubmitClick);
  actionsRow.appendChild(cancelBtn);
  actionsRow.appendChild(submitBtn);
  formView.appendChild(actionsRow);
  panel.appendChild(formView);

  const successView = buildResultView(
    "success", "✓", "Thanks for your feedback!",
    "We received your message and will look into it.",
    "Done", callbacks.onDoneClick,
  );
  panel.appendChild(successView);

  const errorView = buildResultView(
    "error", "!", "Something went wrong",
    "Your feedback could not be submitted. Please try again.",
    "Try again", callbacks.onRetryClick,
  );
  const errorSubtitle = errorView.querySelector(".result-subtitle");
  panel.appendChild(errorView);

  return {
    panel,
    formRefs: {
      formView, titleInput, messageInput, nameInput, emailInput,
      captureBtn, captureBtnLabel, previewWrap, previewImg,
      recordingBadge, submitBtn, aiBtn, aiNote, typeButtons,
    },
    successView,
    errorView,
    errorSubtitle,
  };
}
