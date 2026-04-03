"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😅","😆","😉","🙂","😋","😜","🤗","🤔","😏","😌","😴","🥺","😢","😭","😤","🤯","🥵","🥶","😱","🤮","🤧","😷"],
  },
  {
    name: "Hands",
    emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","🤟","🤙","👋","💪","🙏","✊","👊","🫡","🫶"],
  },
  {
    name: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","💯","💢","💥","✨","🔥","⭐"],
  },
  {
    name: "Objects",
    emojis: ["📎","📁","📂","💼","📝","📌","📍","🔗","💡","🎯","🚀","⚡","🏆","🎉","🎊","🔔","📣","💬","💭","🗓️","⏰","✅","❌","⚠️","🔒","🔑"],
  },
  {
    name: "Reactions",
    emojis: ["👀","💀","🫠","🤡","🤖","👻","😈","💩","🎃","🦄","🐛","🌈","☀️","🌙","🍕","☕","🍺","🎵"],
  },
];

export function EmojiGrid({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="bg-background border border-border/60 rounded-xl shadow-lg w-[320px] overflow-hidden">
      <div className="flex border-b border-border/30 px-1 pt-1 gap-0.5">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(idx)}
            className={cn(
              "px-2 py-1.5 text-[10px] font-medium rounded-t-md transition-colors",
              idx === activeTab
                ? "bg-[#bd882c]/10 text-[#bd882c]"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="p-2 h-[180px] overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
