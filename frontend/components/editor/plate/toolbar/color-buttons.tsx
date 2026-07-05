'use client';

import React, { useState } from 'react';
import { Baseline, Highlighter } from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLOR_PALETTE = [
  '#000000', '#374151', '#6B7280', '#D1D5DB', '#FFFFFF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#FDE68A',
  '#BBF7D0', '#BAE6FD', '#DDD6FE', '#FBCFE8', '#FEF3C7',
];

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onSelect: (color: string) => void;
}

function ColorSwatch({ color, selected, onSelect }: ColorSwatchProps) {
  function handleClick() {
    onSelect(color);
  }
  return (
    <button
      type="button"
      aria-label={color}
      onClick={handleClick}
      className={cn(
        'size-6 rounded border border-border transition-transform hover:scale-110',
        selected && 'ring-2 ring-primary ring-offset-1',
      )}
      style={{ backgroundColor: color }}
    />
  );
}

interface ColorPickerPopoverProps {
  currentColor: string | undefined;
  onApply: (color: string) => void;
  onClear: () => void;
  trigger: React.ReactNode;
}

function ColorPickerPopover({
  currentColor,
  onApply,
  onClear,
  trigger,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(color: string) {
    onApply(color);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-5 gap-1">
          {COLOR_PALETTE.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              selected={currentColor === color}
              onSelect={handleSelect}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs"
          onClick={onClear}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function ColorButtons() {
  const editor = useEditorRef();

  const currentTextColor = useEditorSelector<string | undefined>((e) => {
    const marks = e.api.marks() as Record<string, unknown> | null;
    return marks ? (marks['color'] as string | undefined) : undefined;
  }, []);

  const currentBgColor = useEditorSelector<string | undefined>((e) => {
    const marks = e.api.marks() as Record<string, unknown> | null;
    return marks ? (marks['backgroundColor'] as string | undefined) : undefined;
  }, []);

  function applyTextColor(color: string) {
    editor.tf.addMark('color', color);
  }

  function applyBgColor(color: string) {
    editor.tf.addMark('backgroundColor', color);
  }

  function clearTextColor() {
    editor.tf.removeMark('color');
  }

  function clearBgColor() {
    editor.tf.removeMark('backgroundColor');
  }

  return (
    <>
      <ColorPickerPopover
        currentColor={currentTextColor}
        onApply={applyTextColor}
        onClear={clearTextColor}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Text color"
            className="h-8 w-8 shrink-0 flex-col gap-0 p-0"
          >
            <Baseline className="size-3.5" />
            <span
              className="h-1 w-4 rounded-sm"
              style={{ backgroundColor: currentTextColor ?? '#000000' }}
            />
          </Button>
        }
      />
      <ColorPickerPopover
        currentColor={currentBgColor}
        onApply={applyBgColor}
        onClear={clearBgColor}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Highlight color"
            className="h-8 w-8 shrink-0 flex-col gap-0 p-0"
          >
            <Highlighter className="size-3.5" />
            <span
              className="h-1 w-4 rounded-sm border border-border"
              style={{ backgroundColor: currentBgColor ?? 'transparent' }}
            />
          </Button>
        }
      />
    </>
  );
}
