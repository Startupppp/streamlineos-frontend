
"use client";

import { useSpring } from "@react-spring/web";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useDynamicInView } from "@/features/landing/relay/hooks/animation/use-dynamic-in-view";
import { Tags } from "@/features/landing/relay/types/springs";
import { isMobileDisabled, springsConfig } from "@/features/landing/relay/lib/springs/config";
import { useWindowWidth } from "@/features/landing/relay/hooks/use-window-size";
import { AnimatedVarTextTag } from "./animated-var-text-tag";

type SpringProps = {
  children?: React.ReactNode;
  enabled?: boolean;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  mode?: "always" | "once" | "forward";
  style?: React.CSSProperties;
  config?: Record<string, unknown>;
  delayIn?: number;
  delayOut?: number;
  innerClassName?: string;
  innerTag?: Tags;
  trigger?: React.RefObject<HTMLElement>;
  disableOnMobile?: boolean;
  immediateOut?: boolean;
} & React.HTMLAttributes<HTMLElement>;

export const Inview = forwardRef<HTMLElement, SpringProps & { tag?: Tags }>(
  (
    {
      tag: Tag = "div",
      children,
      from = {},
      to = {},
      mode = "always",
      style,
      config = {},
      delayIn = 0,
      delayOut = 0,
      enabled = true,
      innerTag,
      trigger,
      innerClassName,
      disableOnMobile = false,
      immediateOut = true,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLElement>(null);
    const [setInViewNode, inView] = useDynamicInView({
      trigger: trigger,
    });
    const isAnimated = useRef(false);
    const scrolledDown = useRef(false);
    const width = useWindowWidth();

    useImperativeHandle(ref, () => innerRef.current as HTMLElement);

    useEffect(() => {
      if (
        isMobileDisabled(
          springsConfig.disableOnMobile.inview || disableOnMobile,
          width,
        )
      ) {
        return;
      }
      if (mode === "forward") {
        const handleScroll = () => {
          if (innerRef.current) {
            const rect = innerRef.current.getBoundingClientRect();
            if (rect.top > 0) {
              scrolledDown.current = false;
            } else {
              scrolledDown.current = true;
            }
          }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
      }
    }, [mode, disableOnMobile, width]);

    const active = useMemo(() => {
      if (
        isMobileDisabled(
          springsConfig.disableOnMobile.inview || disableOnMobile,
          width,
        )
      ) {
        return false;
      }

      if (!enabled) {
        return false;
      }

      if (mode === "once" && isAnimated.current) {
        return true;
      }

      if (mode === "forward" && scrolledDown.current) {
        return true;
      }

      if (!isAnimated.current) {
        isAnimated.current = inView;
      }

      return inView;
    }, [inView, mode, enabled, disableOnMobile, width]);

    const springs = useSpring({
      from,
      to: active ? to : from,
      config,
      delay: active ? delayIn : delayOut,
      immediate: !active && immediateOut,
    });

    if (innerTag) {
      return (
        <AnimatedVarTextTag
          tag={Tag}
          ref={(node) => {
            innerRef.current = node as HTMLElement;
            setInViewNode(node);
          }}
          style={{ ...style }}
          {...props}
        >
          <AnimatedVarTextTag
            tag={innerTag}
            className={innerClassName}
            style={{ ...springs }}
          >
            {children}
          </AnimatedVarTextTag>
        </AnimatedVarTextTag>
      );
    }

    return (
      <AnimatedVarTextTag
        tag={Tag}
        ref={(node) => {
          innerRef.current = node as HTMLElement;
          setInViewNode(node);
        }}
        style={{ ...springs, ...style }}
        {...props}
      >
        {children}
      </AnimatedVarTextTag>
    );
  },
);

Inview.displayName = "Inview";
