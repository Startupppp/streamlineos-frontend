"use client";

import { useState, useCallback } from "react";
import { Smile, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJI_PRESETS = [
  "📄", "📝", "📋", "📌", "📍", "🔖", "🏷️", "📁", "📂", "🗂️",
  "💡", "🔬", "🔭", "🔮", "🧪", "🧬", "🔐", "🔑", "🔒", "🔓",
  "💼", "📊", "📈", "📉", "🗃️", "🗄️", "📦", "📧", "📨", "📩",
  "🌐", "🌍", "🗺️", "🏠", "🏢", "🏗️", "🎯", "🎪", "🎨", "🖼️",
  "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📱", "📲", "💾", "💿", "📀",
  "🔊", "🔔", "🚀", "⚡", "🌟", "⭐", "💫", "🎵", "🎶", "🏆",
] as const;

interface EmojiIconPickerProps {
  icon: string | null | undefined;
  onIconChange: (icon: string | null) => void;
  id?: string;
  disabled?: boolean;
}

export function EmojiIconPicker({
  icon,
  onIconChange,
  id,
  disabled = false,
}: EmojiIconPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelectEmoji = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const emoji = e.currentTarget.dataset.emoji;
      if (!emoji) return;
      onIconChange(emoji);
      setOpen(false);
    },
    [onIconChange],
  );

  const handleRemoveIcon = useCallback(() => {
    onIconChange(null);
    setOpen(false);
  }, [onIconChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background px-2 text-xl leading-none transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            !icon && "text-muted-foreground/70",
          )}
          aria-label={icon ? "Change module icon" : "Pick module icon"}
        >
          {icon ?? <Smile className="h-4 w-4" />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold">Pick an icon</p>
          {icon ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-muted-foreground"
              onClick={handleRemoveIcon}
            >
              <X className="h-3 w-3" />
              Remove
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-10 gap-1">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              data-emoji={emoji}
              className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
              aria-label={emoji}
              onClick={handleSelectEmoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
