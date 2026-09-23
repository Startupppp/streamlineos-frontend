"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { KEYS } from "platejs";
import { toUnitLess } from "@platejs/basic-styles";
import { FontSizePlugin } from "@platejs/basic-styles/react";
import { useEditorPlugin, useEditorSelector } from "platejs/react";
import { ToolbarButton } from "./toolbar-button";

const DEFAULT_SIZE = "16";
const MIN_SIZE = 8;
const MAX_SIZE = 96;

function clampSize(raw: string): number | null {
  const parsed = Number.parseInt(toUnitLess(raw), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed));
}

export function FontSizeInput() {
  const { editor, tf } = useEditorPlugin(FontSizePlugin);
  const [inputValue, setInputValue] = useState(DEFAULT_SIZE);
  const [isFocused, setIsFocused] = useState(false);

  const cursorFontSize = useEditorSelector((ed) => {
    const fontSize = ed.api.marks()?.[KEYS.fontSize];
    if (typeof fontSize === "string" && fontSize.length > 0)
      return toUnitLess(fontSize);
    return DEFAULT_SIZE;
  }, []);

  const displayValue = isFocused ? inputValue : cursorFontSize;
  const currentSize = Number.parseInt(displayValue, 10) || Number.parseInt(DEFAULT_SIZE, 10);

  function applySize(size: number) {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
    tf.fontSize.addMark(`${clamped}px`);
    editor.tf.focus();
  }

  function handleDecrement() {
    applySize(currentSize - 1);
  }

  function handleIncrement() {
    applySize(currentSize + 1);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function handleInputFocus() {
    setIsFocused(true);
    setInputValue(toUnitLess(cursorFontSize));
  }

  function handleInputBlur() {
    setIsFocused(false);
    const next = clampSize(inputValue);
    if (next === null) {
      editor.tf.focus();
      return;
    }
    if (String(next) !== toUnitLess(cursorFontSize)) applySize(next);
    else editor.tf.focus();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
  }

  function handleInputMouseDown(event: React.MouseEvent<HTMLInputElement>) {
    event.stopPropagation();
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
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        onMouseDown={handleInputMouseDown}
        min={MIN_SIZE}
        max={MAX_SIZE}
        data-plate-focus="true"
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
