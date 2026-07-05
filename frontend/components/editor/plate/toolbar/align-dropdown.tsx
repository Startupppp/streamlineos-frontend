'use client';

import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import { TextAlignPlugin } from '@platejs/basic-styles/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Alignment = 'left' | 'center' | 'right' | 'justify';

const ALIGN_OPTIONS: { value: Alignment; label: string; icon: React.ReactNode }[] = [
  { value: 'left', label: 'Align left', icon: <AlignLeft className="size-4" /> },
  { value: 'center', label: 'Align center', icon: <AlignCenter className="size-4" /> },
  { value: 'right', label: 'Align right', icon: <AlignRight className="size-4" /> },
  { value: 'justify', label: 'Justify', icon: <AlignJustify className="size-4" /> },
];

const ICONS: Record<Alignment, React.ReactNode> = {
  left: <AlignLeft className="size-4" />,
  center: <AlignCenter className="size-4" />,
  right: <AlignRight className="size-4" />,
  justify: <AlignJustify className="size-4" />,
};

export function AlignDropdown() {
  const editor = useEditorRef();

  const currentAlign = useEditorSelector<Alignment>((e) => {
    const block = e.api.block();
    if (!block) return 'left';
    const val = (block[0] as Record<string, unknown>)['textAlign'];
    if (val === 'center' || val === 'right' || val === 'justify') return val;
    return 'left';
  }, []);

  function handleSelect(value: Alignment) {
    editor.getApi(TextAlignPlugin).textAlign.setNodes(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Text alignment"
          className="h-8 w-8 shrink-0"
        >
          {ICONS[currentAlign]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALIGN_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={cn(currentAlign === opt.value && 'bg-accent text-accent-foreground')}
          >
            {opt.icon}
            <span className="ml-2">{opt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
