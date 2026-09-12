"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { KbSmileIcon, KbXIcon } from "@/features/wiki/lib/kb-icons";
import { cn } from "@/lib/utils";

const EMOJI_PRESETS = [
  "📄","📝","📋","📌","📍","🔖","🏷️","📁","📂","🗂️",
  "💡","🔬","🔭","🔮","🧪","🧬","🔐","🔑","🔒","🔓",
  "💼","📊","📈","📉","🗃️","🗄️","📦","📧","📨","📩",
  "🌐","🌍","🗺️","🏠","🏢","🏗️","🎯","🎪","🎨","🖼️",
  "💻","🖥️","⌨️","🖱️","🖨️","📱","📲","💾","💿","📀",
  "🔊","🔔","🚀","⚡","🌟","⭐","💫","🎵","🎶","🏆",
] as const;

interface PageIconPickerProps {
  icon: string | null;
  isEditable: boolean;
  onIconChange: (icon: string | null) => void;
  id?: string;
  variant?: "inline" | "field";
}

export default function PageIconPicker({
  icon,
  isEditable,
  onIconChange,
  id,
  variant = "inline",
}: PageIconPickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelectEmoji(e: React.MouseEvent<HTMLButtonElement>) {
    const emoji = e.currentTarget.dataset.emoji;
    if (!emoji) return;
    onIconChange(emoji);
    setOpen(false);
  }

  function handleRemoveIcon() {
    onIconChange(null);
    setOpen(false);
  }

  if (!isEditable) {
    if (!icon) return null;
    return <span className="text-4xl leading-none shrink-0">{icon}</span>;
  }

  const isField = variant === "field";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isField ? (
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-md border border-input bg-background px-2 text-xl leading-none transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !icon && "text-muted-foreground"
            )}
            aria-label={icon ? "Change page icon" : "Pick page icon"}
          >
            {icon ?? "📄"}
          </button>
        ) : icon ? (
          <button
            type="button"
            className="text-4xl leading-none shrink-0 hover:opacity-80 transition-opacity"
            aria-label="Change page icon"
          >
            {icon}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground shrink-0"
            aria-label="Add icon"
          >
            <KbSmileIcon className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">Pick an icon</p>
          {icon && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground"
              onClick={handleRemoveIcon}
            >
              <KbXIcon className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>

        <div className="grid grid-cols-10 gap-1">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              data-emoji={emoji}
              className="w-8 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors"
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
