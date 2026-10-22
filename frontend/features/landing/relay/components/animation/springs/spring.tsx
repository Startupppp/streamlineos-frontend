
"use client";

import { animated, useSpring } from "@react-spring/web";
import {
  CSSProperties,
  ElementType,
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { isMobileDisabled, springsConfig } from "@/features/landing/relay/lib/springs/config";
import { useWindowWidth } from "@/features/landing/relay/hooks/use-window-size";
import { Tags } from "@/features/landing/relay/types/springs";

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
  disableOnMobile?: boolean;
  immediateOut?: boolean;
} & React.HTMLAttributes<HTMLElement>;

export interface VarTextTagProps {
  tag?: Tags;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}
const AnimatedVarTextTag = forwardRef<HTMLElement, VarTextTagProps>(
  ({ tag = "span", children, className, style, ...props }, outerRef) => {
    const ref = useRef<HTMLElement | null>(null);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);
    const Tag = animated[tag] as ElementType;

    return (
      <Tag ref={ref} className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  },
);
AnimatedVarTextTag.displayName = "AnimatedVarTextTag";

export const Spring = forwardRef<HTMLElement, SpringProps & { tag?: Tags }>(
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
      disableOnMobile = false,
      immediateOut = false,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLElement>(null);
    const isAnimated = useRef(false);
    const scrolledDown = useRef(false);
    const width = useWindowWidth();

    useImperativeHandle(ref, () => innerRef.current as HTMLElement);

    useEffect(() => {
      if (
        isMobileDisabled(
          springsConfig.disableOnMobile.spring || disableOnMobile,
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
          springsConfig.disableOnMobile.spring || disableOnMobile,
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

      isAnimated.current = true;
      return true;
    }, [mode, enabled, disableOnMobile, width]);

    const springs = useSpring({
      from,
      to: active ? to : from,
      config,
      delay: active ? delayIn : delayOut,
      immediate: !active && immediateOut,
    });

    return (
      <AnimatedVarTextTag
        tag={Tag}
        ref={innerRef}
        style={{ ...springs, ...style }}
        {...props}
      >
        {children}
      </AnimatedVarTextTag>
    );
  },
);

Spring.displayName = "Spring";
