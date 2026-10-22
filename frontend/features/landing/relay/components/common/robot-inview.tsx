"use client";

import { createElement, forwardRef, type ComponentProps } from "react";

import { Inview as MotionInview } from "@/features/landing/relay/components/animation/springs/in-view";

import { restStyle } from "./robot-spring";
import { useRobot } from "./robot-view";

type InviewProps = ComponentProps<typeof MotionInview>;

export const Inview = forwardRef<HTMLElement, InviewProps>(function RobotAwareInview(props, ref) {
  const robot = useRobot();
  if (!robot) return <MotionInview ref={ref} {...props} />;
  const {
    tag = "div",
    children,
    from: _from,
    to,
    mode: _mode,
    config: _config,
    delayIn: _delayIn,
    delayOut: _delayOut,
    enabled: _enabled,
    trigger: _trigger,
    disableOnMobile: _disableOnMobile,
    immediateOut: _immediateOut,
    innerTag,
    innerClassName,
    style,
    ...rest
  } = props;
  if (innerTag)
    return createElement(
      tag as string,
      { ...rest, ref, style },
      createElement(innerTag as string, { className: innerClassName, style: restStyle(to) }, children),
    );
  return createElement(tag as string, { ...rest, ref, style: restStyle(to, style) }, children);
});
