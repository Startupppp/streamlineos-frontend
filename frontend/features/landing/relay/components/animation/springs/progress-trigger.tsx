
"use client";

import { CSSProperties, forwardRef, useImperativeHandle, useRef } from "react";
import { SpringConfig, config } from "@react-spring/web";
import { Tags } from "@/features/landing/relay/types/springs";
import { useProgressTrigger } from "@/features/landing/relay/hooks/animation/use-progress-trigger";

const VarTextTag = forwardRef<HTMLElement, { tag?: Tags; children?: React.ReactNode; className?: string; style?: CSSProperties; [key: string]: unknown }>(
  ({ tag = "span", children, className, style, ...props }, outerRef) => {
    const ref = useRef<HTMLElement | null>(null);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);
    const Tag = tag as unknown as React.ElementType;
    return (
      <Tag ref={ref} className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  },
);
VarTextTag.displayName = "VarTextTag";

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

type ProgressTriggerProps = {
  children?: React.ReactNode;
  enabled?: boolean;
  trigger?: React.RefObject<HTMLElement> | undefined;
  start?: TriggerPos;
  end?: TriggerPos;
  onChange?: (state: {
    progress: number;
    interpolatedProgress: number;
  }) => void;
  disableOnMobile?: boolean;
  config?: SpringConfig;
  frameInterval?: number;
} & Omit<React.HTMLAttributes<HTMLElement>, "onChange">;

export const ProgressTrigger = forwardRef<
  HTMLElement,
  ProgressTriggerProps & { tag?: Tags }
>(
  (
    {
      tag: Tag = "div",
      children,
      start = "top bottom",
      end = "bottom top",
      trigger = undefined,
      onChange,
      enabled = true,
      disableOnMobile = false,
      frameInterval = 10,
      config: springConfig = config.default,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLElement);

    useProgressTrigger({
      start,
      end,
      trigger,
      onChange,
      enabled,
      disableOnMobile,
      frameInterval,
      config: springConfig,
      elementRef: innerRef,
    });

    if (trigger && Tag === undefined) {
      return <>{children}</>;
    }

    return (
      <VarTextTag tag={Tag} ref={innerRef} {...props}>
        {children}
      </VarTextTag>
    );
  },
);

ProgressTrigger.displayName = "ProgressTrigger";
