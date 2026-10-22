"use client";


import { RefObject, useEffect, useRef, useState } from "react";

interface IntersectionObserverOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  onEnter?: (entry: IntersectionObserverEntry) => void;
  onLeave?: (entry: IntersectionObserverEntry) => void;
  trigger?: RefObject<HTMLElement | HTMLDivElement | null>;
}

type TargetRefCallback = (node: HTMLElement | null) => void;

export const useDynamicInView = (
  options: IntersectionObserverOptions = {},
): [TargetRefCallback, boolean, RefObject<boolean>] => {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const inViewRef = useRef(false);

  const { trigger, root, rootMargin, threshold, onEnter, onLeave } = options;

  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onEnterRef.current = onEnter;
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    const target = trigger?.current ?? node;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        inViewRef.current = intersecting;
        setInView(intersecting);
        if (intersecting) {
          onEnterRef.current?.(entry);
        } else {
          onLeaveRef.current?.(entry);
        }
      },
      { root, rootMargin, threshold },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [node, trigger, root, rootMargin, threshold]);

  return [setNode, inView, inViewRef];
};
