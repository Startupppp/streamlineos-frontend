"use client";

import { Plus, Hash, Search } from "lucide-react";
import { EmptyMailIllustration } from "@/components/illustrations";

export function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <EmptyMailIllustration className="mb-6 w-44 h-44" />
      <h3 className="text-lg font-bold mb-1">Welcome to Chat</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
        Select a conversation or start a new one.
      </p>
      <div className="flex items-center gap-6 mt-5">
        <button onClick={onNewDM} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">New DM</span>
        </button>
        <button onClick={onNewChannel} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <Hash className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Channel</span>
        </button>
        <button onClick={onSearch} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Search</span>
        </button>
      </div>
    </div>
  );
}
