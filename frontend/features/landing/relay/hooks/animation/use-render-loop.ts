"use client";


import { useEffect, useRef } from "react";

import { subscribeToTicker } from "@/features/landing/relay/lib/animation/ticker";

export interface LoopProps {
  onMount?: () => void;
  onUnMount?: () => void;
  framerate?: number;
}

const DEFAULT_FRAMERATE = 100;

export const useLoop = (
  onRender: (time: number) => void,
  props: LoopProps = {},
) => {
  const onRenderRef = useRef(onRender);
  const propsRef = useRef(props);

  useEffect(() => {
    onRenderRef.current = onRender;
    propsRef.current = props;
  });

  useEffect(() => {
    propsRef.current.onMount?.();

    const unsubscribe = subscribeToTicker(
      (time) => onRenderRef.current(time),
      () => propsRef.current.framerate ?? DEFAULT_FRAMERATE,
    );

    return () => {
      unsubscribe();
      propsRef.current.onUnMount?.();
    };
  }, []);
};
