'use client';

import { useState, type MouseEvent } from 'react';
import { Smile } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const COMMON_EMOJIS = [
  '😀', '😂', '🥰', '😊', '🤔', '😎', '🥳', '😅',
  '👍', '👎', '👋', '🙏', '🎉', '✅', '❌', '⭐',
  '🔥', '💡', '📌', '📎', '🔗', '💬', '📝', '🗂️',
  '🚀', '⚡', '🌟', '💎', '🎯', '🏆', '💯', '⚠️',
  '📊', '📈', '📉', '🔒', '🔓', 'ℹ️', '✨', '🌈',
];

export function EmojiButton() {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);

  function handleEmojiSelect(emoji: string) {
    editor.tf.focus();
    editor.tf.insertText(emoji);
    setOpen(false);
  }

  function handleMouseDown(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Insert emoji"
              className="h-8 w-8 shrink-0"
              onMouseDown={handleMouseDown}
            >
              <Smile className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Insert emoji</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-8 gap-0.5">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="flex size-8 items-center justify-center rounded text-lg hover:bg-accent transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
