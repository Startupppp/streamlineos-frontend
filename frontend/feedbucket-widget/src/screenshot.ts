import { domToBlob } from "modern-screenshot";

export async function captureScreenshot(hideElement?: HTMLElement): Promise<Blob | null> {
  const previous = hideElement ? hideElement.style.display : "";
  if (hideElement) hideElement.style.display = "none";
  try {
    const blob = await domToBlob(document.documentElement, {
      scale: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: "#ffffff",
    });
    return blob;
  } catch {
    return null;
  } finally {
    if (hideElement) hideElement.style.display = previous;
  }
}
