import { snapdom, preCache, type SnapdomOptions } from "@zumer/snapdom";

const HIDE_MARKER = "data-feedbucket-hide";

const EXCLUDE = [
  "#feedbucket-widget-host",
  "#feedbucket-annotator",
  "script",
  "noscript",
  `[${HIDE_MARKER}]`,
];

function widgetScriptOrigin(): string | null {
  try {
    const script = document.querySelector<HTMLScriptElement>("script[data-key][src]");
    if (script?.src) return new URL(script.src).origin;
  } catch {
    return null;
  }
  return null;
}

function imageProxyPrefix(): string | undefined {
  const scriptOrigin = widgetScriptOrigin();
  const pageOrigin = window.location.origin;
  if (scriptOrigin && scriptOrigin !== pageOrigin) return undefined;
  return `${pageOrigin}/_next/image?w=128&q=75&url=`;
}

function captureOptions(): SnapdomOptions {
  const useProxy = imageProxyPrefix();
  return {
    scale: 1,
    dpr: 1,
    fast: true,
    backgroundColor: "#ffffff",
    embedFonts: false,
    cache: "full",
    excludeMode: "remove",
    exclude: EXCLUDE,
    placeholders: true,
    ...(useProxy ? { useProxy } : {}),
  };
}

export function warmScreenshotCache(): void {
  const useProxy = imageProxyPrefix();
  void preCache(document.body, {
    cache: "full",
    embedFonts: false,
    ...(useProxy ? { useProxy } : {}),
  }).catch(() => undefined);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function captureScreenshot(hideElement?: HTMLElement): Promise<Blob | null> {
  if (hideElement) hideElement.setAttribute(HIDE_MARKER, "");
  await nextFrame();
  try {
    const snap = await snapdom(document.body, captureOptions());
    return await snap.toBlob({ type: "jpeg", quality: 0.7 });
  } catch {
    return null;
  } finally {
    if (hideElement) hideElement.removeAttribute(HIDE_MARKER);
  }
}
