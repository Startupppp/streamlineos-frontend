'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import type { TElement } from 'platejs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlockOption {
  key: string;
  label: string;
  nodeType: string;
  listStyleType?: string;
}

const BLOCK_OPTIONS: BlockOption[] = [
  { key: 'p', label: 'Text', nodeType: 'p' },
  { key: 'h1', label: 'Heading 1', nodeType: 'h1' },
  { key: 'h2', label: 'Heading 2', nodeType: 'h2' },
  { key: 'h3', label: 'Heading 3', nodeType: 'h3' },
  { key: 'blockquote', label: 'Quote', nodeType: 'blockquote' },
  { key: 'code_block', label: 'Code Block', nodeType: 'code_block' },
  { key: 'callout', label: 'Callout', nodeType: 'callout' },
  { key: 'toggle', label: 'Toggle', nodeType: 'toggle' },
  { key: 'ul', label: 'Bullet List', nodeType: 'p', listStyleType: 'disc' },
  { key: 'ol', label: 'Numbered List', nodeType: 'p', listStyleType: 'decimal' },
  { key: 'todo', label: 'To-do List', nodeType: 'p', listStyleType: 'todo' },
];

function getCurrentLabel(node: TElement): string {
  const lst = node.listStyleType as string | undefined;
  if (lst === 'disc') return 'Bullet List';
  if (lst === 'decimal') return 'Numbered List';
  if (lst === 'todo') return 'To-do List';
  const match = BLOCK_OPTIONS.find((o) => o.nodeType === node.type && !o.listStyleType);
  return match?.label ?? 'Text';
}

export function TurnIntoDropdown() {
  const editor = useEditorRef();

  const currentLabel = useEditorSelector<string>((e) => {
    const block = e.api.block();
    if (!block) return 'Text';
    return getCurrentLabel(block[0]);
  }, []);

  function handleSelect(opt: BlockOption) {
    const block = editor.api.block() ?? editor.api.block({ at: [0] });
    if (!block) return;
    const [, path] = block;
    if (opt.listStyleType) {
      editor.tf.setNodes(
        { type: 'p', listStyleType: opt.listStyleType, indent: 1 } as Partial<TElement>,
        { at: path },
      );
    } else {
      const unset: Partial<TElement> = { listStyleType: undefined, indent: undefined };
      editor.tf.setNodes(
        { ...unset, type: opt.nodeType } as Partial<TElement>,
        { at: path },
      );
    }
    editor.tf.focus();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Turn into"
          className="gap-1 px-2 text-xs font-normal"
        >
          <span className="max-w-[80px] truncate">{currentLabel}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {BLOCK_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.key}
            onClick={() => handleSelect(opt)}
            className={cn(
              currentLabel === opt.label && 'bg-accent text-accent-foreground',
            )}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
