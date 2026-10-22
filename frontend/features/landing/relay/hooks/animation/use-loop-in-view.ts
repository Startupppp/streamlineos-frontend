"use client";


import { useEffect, useRef } from "react";
import { useLoop, LoopProps } from "./use-render-loop";

export const useLoopInView = (
  ref: React.RefObject<HTMLDivElement>,
  onRender: (time: number) => void,
  props: LoopProps = {},
) => {
  const isInView = useRef(false);
  const renderCount = useRef(0);
  const shouldRender = useRef(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (isInView.current !== entry.isIntersecting) {
          if (!entry.isIntersecting) {
            renderCount.current = 0;
            shouldRender.current = true;
          }
        }
        isInView.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );

    if (ref.current) {
      observer.observe(ref.current);
      renderCount.current = 0;
      shouldRender.current = true;
    }

    return () => observer.disconnect();
  }, [ref]);

  useLoop((time) => {
    if (isInView.current || shouldRender.current) {
      onRender(time);

      if (!isInView.current) {
        renderCount.current++;
        if (renderCount.current >= 10) {
          shouldRender.current = false;
        }
      }
    }
  }, props);
};
