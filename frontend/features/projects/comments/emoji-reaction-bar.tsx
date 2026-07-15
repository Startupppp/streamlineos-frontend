"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "😄", "🎉", "🚀", "👀", "✅", "🔥"];

export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface EmojiReactionBarProps {
  reactions: ReactionGroup[];
  onReact: (emoji: string) => void;
  onUnreact: (emoji: string) => void;
}

export function EmojiReactionBar({ reactions, onReact, onUnreact }: EmojiReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && e.target instanceof Node && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function handleEmojiClick(emoji: string) {
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing?.hasReacted) onUnreact(emoji);
    else onReact(emoji);
    setShowPicker(false);
  }

  function handleToggle() {
    setShowPicker((v) => !v);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => handleEmojiClick(r.emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
            r.hasReacted
              ? "bg-primary/10 border-primary/20 text-foreground"
              : "bg-muted border-border text-muted-foreground hover:border-primary/20 hover:bg-primary/5"
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}

      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Add reaction"
          className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-muted hover:border-border/80 hover:bg-accent transition-all opacity-0 group-hover:opacity-100"
        >
          <SmilePlus className="h-3 w-3 text-muted-foreground" />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-8 left-0 z-50 flex gap-1 p-2 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-xl"
            >
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleEmojiClick(e)}
                  aria-label={`React with ${e}`}
                  className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-base"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
