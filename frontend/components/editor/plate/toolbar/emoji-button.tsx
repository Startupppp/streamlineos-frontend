'use client';

import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { ToolbarButton } from './toolbar-button';

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton tooltip="Insert emoji" aria-label="Insert emoji">
          <Smile className="size-4" />
        </ToolbarButton>
      </PopoverTrigger>
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
