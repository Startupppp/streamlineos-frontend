const VIEWPORTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const;

type ViewportName = keyof typeof VIEWPORTS;

function setViewport(width: number): () => void {
  const original = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });

  window.matchMedia = (query: string): MediaQueryList => {
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
    const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
    let matches = false;
    if (minWidthMatch) matches = width >= Number(minWidthMatch[1]);
    else if (maxWidthMatch) matches = width <= Number(maxWidthMatch[1]);

    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };

  return () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: original,
    });
    window.matchMedia = originalMatchMedia;
  };
}

function atViewport(name: ViewportName): () => void {
  return setViewport(VIEWPORTS[name]);
}

function setReducedMotion(prefersReduced: boolean): () => void {
  const originalMatchMedia = window.matchMedia;

  window.matchMedia = (query: string): MediaQueryList => {
    if (query === "(prefers-reduced-motion: reduce)") {
      return {
        matches: prefersReduced,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    }
    return originalMatchMedia(query);
  };

  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

export { setViewport, atViewport, setReducedMotion, VIEWPORTS };
export type { ViewportName };
