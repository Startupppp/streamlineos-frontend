import { domToBlob } from "modern-screenshot";

export async function captureScreenshot(hideElement?: HTMLElement): Promise<Blob | null> {
  const previous = hideElement ? hideElement.style.display : "";
  if (hideElement) hideElement.style.display = "none";
  try {
    const blob = await domToBlob(document.documentElement, {
      scale: 1,
      backgroundColor: "#ffffff",
      type: "image/jpeg",
      quality: 0.82,
    });
    return blob;
  } catch {
    return null;
  } finally {
    if (hideElement) hideElement.style.display = previous;
  }
}
