"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { useEditorRef, useEditorSelector } from "platejs/react";
import { ToolbarButton } from "./toolbar-button";

const DEFAULT_SIZE = 16;
const MIN_SIZE = 8;
const MAX_SIZE = 96;

function parseSize(raw: unknown): number {
  if (typeof raw !== "string") return DEFAULT_SIZE;
  const parsed = Number.parseInt(raw.replace("px", ""), 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SIZE;
}

export function FontSizeInput() {
  const editor = useEditorRef();

  const currentSize = useEditorSelector<number>((ed) => {
    const marks = ed.api.marks() as Record<string, unknown> | null;
    return parseSize(marks?.["fontSize"]);
  }, []);

  function applySize(size: number) {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
    editor.tf.addMark("fontSize", `${clamped}px`);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(parsed)) applySize(parsed);
  }

  function handleInputMouseDown(event: React.MouseEvent<HTMLInputElement>) {
    event.stopPropagation();
  }

  function handleIncrement() {
    applySize(currentSize + 1);
  }

  function handleDecrement() {
    applySize(currentSize - 1);
  }

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-md border border-border">
      <ToolbarButton
        tooltip="Decrease font size"
        disabled={currentSize <= MIN_SIZE}
        onClick={handleDecrement}
        aria-label="Decrease font size"
      >
        <Minus className="size-3.5" />
      </ToolbarButton>
      <input
        inputMode="numeric"
        role="spinbutton"
        value={currentSize}
        onChange={handleInputChange}
        onMouseDown={handleInputMouseDown}
        min={MIN_SIZE}
        max={MAX_SIZE}
        aria-label="Font size"
        className="h-8 w-8 shrink-0 border-x border-border bg-transparent text-center text-xs tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <ToolbarButton
        tooltip="Increase font size"
        disabled={currentSize >= MAX_SIZE}
        onClick={handleIncrement}
        aria-label="Increase font size"
      >
        <Plus className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
