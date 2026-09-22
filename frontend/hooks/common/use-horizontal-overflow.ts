"use client";

import { useEffect, useState, type RefObject } from "react";

export interface HorizontalOverflow {
  scrolls: boolean;
  hiddenLeft: boolean;
  hiddenRight: boolean;
}

const NONE: HorizontalOverflow = { scrolls: false, hiddenLeft: false, hiddenRight: false };

function measure(element: HTMLElement): HorizontalOverflow {
  const overflow = element.scrollWidth - element.clientWidth;
  if (overflow <= 1) return NONE;
  return {
    scrolls: true,
    hiddenLeft: element.scrollLeft > 1,
    hiddenRight: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
  };
}

export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, revision?: unknown): HorizontalOverflow {
  const [state, setState] = useState<HorizontalOverflow>(NONE);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => setState(measure(element));
    update();
    element.addEventListener("scroll", update, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => element.removeEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref, revision]);

  return state;
}

export const OVERFLOW_EDGE_FADE_CLASS =
  "data-[hidden-right=true]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] data-[hidden-left=true]:data-[hidden-right=true]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)] data-[hidden-left=true]:data-[hidden-right=false]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem)]";
