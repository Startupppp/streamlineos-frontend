import { domToBlob } from "modern-screenshot";

function shouldIncludeNode(hideElement: HTMLElement | undefined) {
  return (node: Node): boolean => {
    if (node === hideElement) return false;
    if (node instanceof Element) {
      const id = node.id;
      if (id === "feedbucket-widget-host" || id === "feedbucket-annotator") return false;
      const tag = node.tagName.toLowerCase();
      if (tag === "script" || tag === "noscript") return false;
      const style = (node as HTMLElement).style;
      if (style && style.display === "none") return false;
      if (style && style.visibility === "hidden") return false;
    }
    return true;
  };
}

export async function captureScreenshot(hideElement?: HTMLElement): Promise<Blob | null> {
  try {
    const blob = await domToBlob(document.documentElement, {
      scale: 1,
      backgroundColor: "#ffffff",
      type: "image/jpeg",
      quality: 0.82,
      font: false,
      timeout: 5000,
      workerNumber: 0,
      fetch: {
        requestInit: { cache: "force-cache" },
        bypassingCache: false,
      },
      features: {
        copyScrollbar: false,
        removeAbnormalAttributes: true,
        removeControlCharacter: false,
        fixSvgXmlDecode: false,
      },
      filter: shouldIncludeNode(hideElement),
    });
    return blob;
  } catch {
    return null;
  }
}
