import { initConsoleCapture } from "./console-capture";
import { initNetworkCapture } from "./network-capture";
import { mountWidget } from "./ui";

declare const __WIDGET_API_BASE__: string;

initConsoleCapture();
initNetworkCapture(__WIDGET_API_BASE__);

function getScriptElement(): HTMLScriptElement | null {
  const current = document.currentScript;
  if (current instanceof HTMLScriptElement) return current;
  const found = document.querySelector("script[data-key]");
  if (found instanceof HTMLScriptElement) return found;
  return null;
}

const capturedScript = getScriptElement();

function findScriptFallback(): HTMLScriptElement | null {
  const el = document.querySelector("script[data-key]");
  return el instanceof HTMLScriptElement ? el : null;
}

function init(): void {
  const scriptEl = capturedScript ?? findScriptFallback();
  if (!scriptEl) return;

  const embedKey = scriptEl.getAttribute("data-key") ?? "";
  if (!embedKey) return;

  const apiBase = scriptEl.getAttribute("data-api") ?? __WIDGET_API_BASE__;

  const hostEl = document.createElement("div");
  hostEl.id = "feedbucket-root";

  if (!document.body) return;
  document.body.appendChild(hostEl);

  mountWidget(hostEl, apiBase, embedKey);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
