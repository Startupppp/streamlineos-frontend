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

  const measure = React.useCallback(
    (node: HTMLSpanElement) => {
      const overflow =
        lines === 1
          ? node.scrollWidth - node.clientWidth > 1
          : node.scrollHeight - node.clientHeight > 1;
      setTruncated(overflow);
    },
    [lines],
  );

  const setNode = React.useCallback(
    (node: HTMLSpanElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      measure(node);
      const observer = new ResizeObserver(() => measure(node));
      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  if (!truncated) {
    return (
      <span ref={setNode} className={cn(CLAMP_CLASS[lines], className)}>
        {text}
      </span>
    );
  }

  function handlePointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    if (event.pointerType === "touch") setOpen((value) => !value);
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          ref={setNode}
          tabIndex={0}
          onPointerUp={handlePointerUp}
          className={cn(CLAMP_CLASS[lines], "cursor-default outline-none", className)}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn("max-w-[min(90vw,22rem)] whitespace-normal break-words", tooltipClassName)}
      >
        {tooltip ?? text}
      </TooltipContent>
    </Tooltip>
  );
}
