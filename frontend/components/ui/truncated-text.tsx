"use client";

import * as React from "react";
import {
  TEXT_ONE_LINE,
  TEXT_TWO_LINES,
  TEXT_THREE_LINES,
} from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

type ClampLines = 1 | 2 | 3;

const CLAMP_CLASS: Record<ClampLines, string> = {
  1: TEXT_ONE_LINE,
  2: TEXT_TWO_LINES,
  3: TEXT_THREE_LINES,
};

interface TruncatedTextProps {
  text: string;
  lines?: ClampLines;
  className?: string;
  tooltip?: React.ReactNode;
}

function tooltipTitle(tooltip: React.ReactNode, text: string): string {
  return typeof tooltip === "string" ? tooltip : text;
}

function isOverflowing(node: HTMLSpanElement, lines: ClampLines): boolean {
  if (lines !== 1) {
    return node.scrollHeight - node.clientHeight > 1;
  }

  if (node.scrollWidth - node.clientWidth > 1) return true;

  if (typeof Range === "undefined" || node.clientWidth <= 0) return false;

  const range = document.createRange();
  range.selectNodeContents(node);
  const textWidth = range.getBoundingClientRect().width;
  return textWidth - node.clientWidth > 1;
}

export function TruncatedText({
  text,
  lines = 1,
  className,
  tooltip,
}: TruncatedTextProps) {
  const [truncated, setTruncated] = React.useState(false);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const rafRef = React.useRef<number>(0);

  const measure = React.useCallback(
    (node: HTMLSpanElement) => {
      const nextTruncated = isOverflowing(node, lines);
      setTruncated((current) => (current === nextTruncated ? current : nextTruncated));
    },
    [lines],
  );

  const setNode = React.useCallback(
    (node: HTMLSpanElement | null) => {
      observerRef.current?.disconnect();
      cancelAnimationFrame(rafRef.current);
      observerRef.current = null;
      if (!node) return;
      rafRef.current = requestAnimationFrame(() => measure(node));
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => measure(node));
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  return (
    <span
      ref={setNode}
      title={truncated ? tooltipTitle(tooltip, text) : undefined}
      className={cn(CLAMP_CLASS[lines], className)}
    >
      {text}
    </span>
  );
}
