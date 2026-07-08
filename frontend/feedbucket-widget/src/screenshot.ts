import html2canvas from "html2canvas";

export async function captureScreenshot(
  hideElement?: HTMLElement
): Promise<Blob | null> {
  const originalDisplay = hideElement?.style.display;
  if (hideElement) hideElement.style.display = "none";

  try {
    const canvas = await html2canvas(document.documentElement, {
      useCORS: true,
      logging: false,
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.85);
    });
  } catch {
    return null;
  } finally {
    if (hideElement && originalDisplay !== undefined) {
      hideElement.style.display = originalDisplay;
    }
  }
}
