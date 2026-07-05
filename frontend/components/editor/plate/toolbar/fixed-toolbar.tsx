'use client';

import React from 'react';
import { Minus } from 'lucide-react';
import { useEditorReadOnly, useEditorRef } from 'platejs/react';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UploadedKbMedia } from '@/features/knowledge-base/lib/upload-kb-media';
import { ToolbarButton } from './toolbar-button';
import { HistoryButtons } from './history-buttons';
import { TurnIntoDropdown } from './turn-into-dropdown';
import { FontSizeInput } from './font-size-input';
import { MarkButtons } from './mark-buttons';
import { ColorButtons } from './color-buttons';
import { AlignDropdown } from './align-dropdown';
import { ListButtons } from './list-buttons';
import { LinkButton } from './link-button';
import { TableDropdown } from './table-dropdown';
import { EmojiButton } from './emoji-button';
import { MediaButtons } from './media-buttons';

interface FixedToolbarProps {
  uploadFile?: (file: File) => Promise<UploadedKbMedia>;
}

function VSep() {
  return <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />;
}

function HrButton() {
  const editor = useEditorRef();
  function handleClick() {
    editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] });
  }
  return (
    <ToolbarButton tooltip="Divider" onClick={handleClick} aria-label="Insert horizontal rule">
      <Minus className="size-4" />
    </ToolbarButton>
  );
}

export function FixedToolbar({ uploadFile }: FixedToolbarProps) {
  const readOnly = useEditorReadOnly();
  if (readOnly) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="sticky top-0 z-30 flex items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-2 py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        <HistoryButtons />
        <VSep />
        <TurnIntoDropdown />
        <VSep />
        <FontSizeInput />
        <VSep />
        <MarkButtons />
        <VSep />
        <ColorButtons />
        <VSep />
        <AlignDropdown />
        <VSep />
        <ListButtons />
        <VSep />
        <LinkButton />
        <TableDropdown />
        <EmojiButton />
        <HrButton />
        {uploadFile && (
          <>
            <VSep />
            <MediaButtons uploadFile={uploadFile} />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
