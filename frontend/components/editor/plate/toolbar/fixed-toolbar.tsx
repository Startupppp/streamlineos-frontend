'use client';

import { useEditorReadOnly } from 'platejs/react';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UploadedEditorMedia } from '@/components/editor/plate/upload-media';
import { HistoryButtons } from './history-buttons';
import { TurnIntoDropdown } from './turn-into-dropdown';
import { FontSizeInput } from './font-size-input';
import { MarkButtons } from './mark-buttons';
import { ListButtons } from './list-buttons';
import { LinkButton } from './link-button';
import { FormattingMore } from './formatting-more';

interface FixedToolbarProps {
  uploadFile?: (file: File) => Promise<UploadedEditorMedia>;
}

function VSep() {
  return <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />;
}

export function FixedToolbar({ uploadFile }: FixedToolbarProps) {
  const readOnly = useEditorReadOnly();
  if (readOnly) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto py-1 scrollbar-hide">
        <HistoryButtons />
        <VSep />
        <TurnIntoDropdown />
        <VSep />
        <FontSizeInput />
        <VSep />
        <MarkButtons />
        <VSep />
        <ListButtons />
        <VSep />
        <LinkButton />
        <FormattingMore uploadFile={uploadFile} />
      </div>
    </TooltipProvider>
  );
}
