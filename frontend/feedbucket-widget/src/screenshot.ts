import { snapdom, preCache } from "@zumer/snapdom";

const HIDE_MARKER = "data-feedbucket-hide";

const EXCLUDE = [
  "#feedbucket-widget-host",
  "#feedbucket-annotator",
  "script",
  "noscript",
  `[${HIDE_MARKER}]`,
];

export function warmScreenshotCache(): void {
  void preCache(document.body, { cache: "full", embedFonts: false }).catch(() => undefined);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function captureScreenshot(hideElement?: HTMLElement): Promise<Blob | null> {
  if (hideElement) hideElement.setAttribute(HIDE_MARKER, "");
  await nextFrame();
  try {
    const snap = await snapdom(document.body, {
      scale: 1,
      dpr: 1,
      fast: true,
      backgroundColor: "#ffffff",
      embedFonts: false,
      cache: "full",
      excludeMode: "remove",
      exclude: EXCLUDE,
    });
    return await snap.toBlob({ type: "jpeg", quality: 0.7 });
  } catch {
    return null;
  } finally {
    if (hideElement) hideElement.removeAttribute(HIDE_MARKER);
  }
}
