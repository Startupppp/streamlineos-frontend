"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  tooltipClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  tooltip?: React.ReactNode;
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
  tooltipClassName,
  side = "top",
  tooltip,
}: TruncatedTextProps) {
  const [truncated, setTruncated] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const rafRef = React.useRef<number>(0);

  const measure = React.useCallback(
    (node: HTMLSpanElement) => {
      setTruncated(isOverflowing(node, lines));
    },
    [lines],
  );

  React.useEffect(() => {
    if (!truncated) setOpen(false);
  }, [truncated]);

  const setNode = React.useCallback(
    (node: HTMLSpanElement | null) => {
      observerRef.current?.disconnect();
      cancelAnimationFrame(rafRef.current);
      observerRef.current = null;
      if (!node) return;
      measure(node);
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => measure(node));
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  function handleOpenChange(next: boolean) {
    if (!truncated) {
      setOpen(false);
      return;
    }
    setOpen(next);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    if (!truncated) return;
    if (event.pointerType === "touch") setOpen((value) => !value);
  }

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange} delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          ref={setNode}
          tabIndex={truncated ? 0 : undefined}
          onPointerUp={handlePointerUp}
          className={cn(
            CLAMP_CLASS[lines],
            truncated && "cursor-default outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm",
            className,
          )}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          "max-w-[min(90vw,22rem)] whitespace-normal break-words",
          tooltipClassName,
        )}
      >
        {tooltip ?? text}
      </TooltipContent>
    </Tooltip>
  );
}
