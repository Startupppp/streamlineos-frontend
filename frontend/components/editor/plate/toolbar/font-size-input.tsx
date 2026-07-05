'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import { Button } from '@/components/ui/button';

const DEFAULT_SIZE = 16;
const MIN_SIZE = 8;
const MAX_SIZE = 96;

function parseSize(raw: unknown): number {
  if (typeof raw !== 'string') return DEFAULT_SIZE;
  const n = parseInt(raw.replace('px', ''), 10);
  return isNaN(n) ? DEFAULT_SIZE : n;
}

export function FontSizeInput() {
  const editor = useEditorRef();

  const currentSize = useEditorSelector<number>((e) => {
    const marks = e.api.marks() as Record<string, unknown> | null;
    return parseSize(marks?.['fontSize']);
  }, []);

  function applySize(size: number) {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
    editor.tf.addMarks({ fontSize: `${clamped}px` });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = parseInt(e.target.value, 10);
    if (!isNaN(n)) applySize(n);
  }

  function handleIncrement() {
    applySize(currentSize + 1);
  }

  function handleDecrement() {
    applySize(currentSize - 1);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Decrease font size"
        onClick={handleDecrement}
        className="h-8 w-5 shrink-0 p-0"
      >
        <ChevronDown className="size-3" />
      </Button>
      <input
        type="number"
        value={currentSize}
        onChange={handleInputChange}
        min={MIN_SIZE}
        max={MAX_SIZE}
        aria-label="Font size"
        className="h-8 w-10 rounded-md border border-border bg-transparent text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Increase font size"
        onClick={handleIncrement}
        className="h-8 w-5 shrink-0 p-0"
      >
        <ChevronUp className="size-3" />
      </Button>
    </div>
  );
}
