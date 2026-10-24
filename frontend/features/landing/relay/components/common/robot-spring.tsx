"use client";

import { type CSSProperties } from "react";

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

