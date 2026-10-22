
import { SpringConfig, useSpring } from "@react-spring/web";
import { RefObject, useEffect, useMemo, useRef } from "react";
import { useWindowWidth } from "@/features/landing/relay/hooks/use-window-size";
import { isMobileDisabled, springsConfig } from "@/features/landing/relay/lib/springs/config";
import { interpolate } from "@/features/landing/relay/utils/math";
import { useLoopInView } from "@/features/landing/relay/hooks/animation/use-loop-in-view";

export type TriggerPos =
  | "top top"
  | "center top"
  | "bottom top"
  | "top center"
  | "center center"
  | "bottom center"
  | "top bottom"
  | "center bottom"
  | "bottom bottom";

interface UseSpringTriggerProps {
  enabled?: boolean;
  trigger?: RefObject<HTMLElement> | undefined;
  start?: TriggerPos;
  end?: TriggerPos;
  onChange?: (state: {
    progress: number;
    interpolatedProgress: number;
  }) => void;
  from?: { [x: string]: string | number };
  to?: { [x: string]: string | number };
  disableOnMobile?: boolean;
  config?: SpringConfig;
  frameInterval?: number;
  mode?: "toggle" | "scrub";
  elementRef: RefObject<HTMLElement | null>;
}

export function useSpringTrigger({
  start = "top bottom",
  end = "bottom top",
  trigger,
  from = {},
  to = {},
  onChange,
  enabled = true,
  disableOnMobile = false,
  frameInterval = 10,
  config: springConfig = { duration: 1 },
  mode = "scrub",
  elementRef,
}: UseSpringTriggerProps) {
  const width = useWindowWidth();
  const savedProgress = useRef(-1);
  const activeRef = useRef(false);
  const dataRef = useRef({
    from: {},
    to: {},
  });

  useEffect(() => {
    dataRef.current.from = from;
    dataRef.current.to = to;
  }, [from, to]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [{ interpolatedProgress }, springApi] = useSpring(() => ({
    interpolatedProgress: 0,
    config: springConfig,
  }));

  const [springs, api] = useSpring(() => ({
    from,
    config: springConfig,
  }));

  const active = useMemo(() => {
    if (
      isMobileDisabled(
        springsConfig.disableOnMobile.springtrigger || disableOnMobile,
        width,
      )
    ) {
      return false;
    }
    if (!enabled) {
      return false;
    }
    return true;
  }, [enabled, disableOnMobile, width]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  function animate(progress: number) {
    if (!Object.keys(dataRef.current.to).length) return;

    api.start(() => {
      if (mode === "toggle") {
        if (progress >= 1) {
          return {
            ...dataRef.current.to,
            config: springConfig,
          };
        }
        return {
          ...dataRef.current.from,
          config: springConfig,
        };
      }

      const interpolatedValue = interpolate(
        dataRef.current.from,
        dataRef.current.to,
        progress,
      );
      return {
        ...interpolatedValue,
        config: springConfig,
      };
    });
  }

  useLoopInView(
    // @ts-expect-error -- the trigger ref and the element ref differ only in their element type
    trigger || elementRef,
    () => {
      if (typeof window === "undefined") return;
      const _ref = trigger || elementRef;
      if (!activeRef.current || !_ref.current) return;

      const bb = _ref.current.getBoundingClientRect();
      const clientHeight = window.innerHeight;

      const poses = {
        top_top: bb.top,
        center_top: bb.top + bb.height / 2,
        bottom_top: bb.bottom,
        top_bottom: bb.top - clientHeight,
        center_bottom: bb.top + bb.height / 2 - clientHeight,
        bottom_bottom: bb.bottom - clientHeight,
        top_center: bb.top - clientHeight / 2,
        center_center: bb.top + bb.height / 2 - clientHeight / 2,
        bottom_center: bb.bottom - clientHeight / 2,
      };

      const scrollStart =
        poses[start.split(" ").join("_") as keyof typeof poses];
      const scrollEnd = poses[end.split(" ").join("_") as keyof typeof poses];
      const length = Math.abs(scrollStart - scrollEnd);
      const progress = Math.min(
        Math.max(0, 1 - (scrollStart + length) / length),
        1,
      );

      if (progress !== savedProgress.current) {
        savedProgress.current = progress;
        springApi.start({ interpolatedProgress: progress });
        animate(progress);
        onChangeRef.current?.({
          progress,
          interpolatedProgress: interpolatedProgress.get(),
        });
      }
    },
    { framerate: frameInterval },
  );

  return {
    springs,
    interpolatedProgress,
  };
}
