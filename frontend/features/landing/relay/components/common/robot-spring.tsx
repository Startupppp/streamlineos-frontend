"use client";

import {
  createElement,
  forwardRef,
  type ComponentProps,
  type CSSProperties,
} from "react";

import { Spring as MotionSpring } from "@/features/landing/relay/components/animation/springs/spring";

import { useRobot } from "./robot-view";

type SpringProps = ComponentProps<typeof MotionSpring>;

const TRANSFORM = new Set(["x", "y", "z", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "rotateZ"]);
const px = (v: unknown) => (typeof v === "number" ? `${v}px` : String(v));
const deg = (v: unknown) => (typeof v === "number" ? `${v}deg` : String(v));

export const restStyle = (to: Record<string, unknown> = {}, style?: CSSProperties): CSSProperties => {
  const out: Record<string, unknown> = { ...style };
  const parts: string[] = [];
  for (const [key, value] of Object.entries(to)) {
    if (!TRANSFORM.has(key)) {
      out[key] = value;
      continue;
    }
    if (key === "x") parts.push(`translateX(${px(value)})`);
    else if (key === "y") parts.push(`translateY(${px(value)})`);
    else if (key === "z") parts.push(`translateZ(${px(value)})`);
    else if (key.startsWith("scale")) parts.push(`${key}(${String(value)})`);
    else parts.push(`${key}(${deg(value)})`);
  }
  if (parts.length) out.transform = parts.join(" ");
  return out as CSSProperties;
};

const Spring = forwardRef<HTMLElement, SpringProps>(function RobotAwareSpring(props, ref) {
  const robot = useRobot();
  if (!robot) return <MotionSpring ref={ref} {...props} />;
  const {
    tag = "div",
    children,
    from,
    to,
    mode,
    config: _config,
    delayIn: _delayIn,
    delayOut: _delayOut,
    enabled,
    disableOnMobile: _disableOnMobile,
    immediateOut: _immediateOut,
    style,
    ...rest
  } = props;
  const resting = mode === "always" && enabled === false ? from : to;
  return createElement(tag as string, { ...rest, ref, style: restStyle(resting, style) }, children);
});
