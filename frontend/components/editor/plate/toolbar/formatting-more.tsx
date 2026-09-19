'use client';

import { Minus, MoreHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { UploadedEditorMedia } from '@/components/editor/plate/upload-media';
import { Button } from '@/components/ui/button';
import { ToolbarButton } from './toolbar-button';
import { ColorButtons } from './color-buttons';
import { AlignDropdown } from './align-dropdown';
import { TableDropdown } from './table-dropdown';
import { EmojiButton } from './emoji-button';
import { MediaButtons } from './media-buttons';
import { Separator } from '@/components/ui/separator';
import { useEditorRef } from 'platejs/react';

interface FormattingMoreProps {
  uploadFile?: (file: File) => Promise<UploadedEditorMedia>;
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

export function FormattingMore({ uploadFile }: FormattingMoreProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Insert and format"
          title="Insert and format"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[min(20rem,calc(100vw-2rem))] flex-wrap items-center gap-0.5 p-2">
        <ColorButtons />
        <AlignDropdown />
        <Separator orientation="vertical" className="mx-0.5 h-5" />
        <TableDropdown />
        <EmojiButton />
        <HrButton />
        {uploadFile ? <MediaButtons uploadFile={uploadFile} /> : null}
      </PopoverContent>
    </Popover>
  );
}
