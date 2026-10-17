"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  variant?: "inline" | "field" | "action" | "hero";
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
    return (
      <span
        className={cn(
          "leading-none shrink-0",
          variant === "hero" ? "text-5xl" : "text-3xl",
        )}
      >
        {icon}
      </span>
    );
  }

  const isField = variant === "field";
  const isAction = variant === "action";
  const isHero = variant === "hero";

  const trigger = isField ? (
    <button
      id={id}
      type="button"
      className={cn(
        "flex h-9 min-w-9 items-center justify-center rounded-md border border-input bg-background px-2 text-xl leading-none transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !icon && "text-muted-foreground",
      )}
      aria-label={icon ? "Change page icon" : "Pick page icon"}
    >
      {icon ?? "📄"}
    </button>
  ) : isAction ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      aria-label="Add icon"
    >
      <KbSmileIcon className="h-3.5 w-3.5" />
    </Button>
  ) : icon ? (
    <button
      type="button"
      className={cn(
        "leading-none shrink-0 transition-opacity hover:opacity-80",
        isHero ? "text-5xl" : "text-3xl",
      )}
      aria-label="Change page icon"
    >
      {icon}
    </button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-muted-foreground"
      aria-label="Add icon"
    >
      <KbSmileIcon className="h-4 w-4" />
    </Button>
  );

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      {isAction ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Add icon
          </TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}

      <PopoverContent className="w-72 p-3">
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
              <KbXIcon className="h-3 w-3" />
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
              className="flex w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
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

  return picker;
}
