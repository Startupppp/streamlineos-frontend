"use client";

import { Plus, Hash, Search } from "lucide-react";
import { ChatIllustration } from "@/components/illustrations";
import { ChannelSidebarCollapseButton } from "./channel-sidebar-collapse-button";

export function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {onToggleSidebar && (
        <div className="h-[56px] px-4 border-b border-border/40 flex items-center shrink-0 bg-card/80 backdrop-blur-sm">
          <ChannelSidebarCollapseButton
            isCollapsed={isSidebarCollapsed ?? false}
            onToggle={onToggleSidebar}
          />
        </div>
      )}
      <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
        <ChatIllustration className="mb-6 h-44 w-44" />
        <h3 className="text-lg font-bold mb-1">Welcome to Chat</h3>
        <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
          Select a conversation or start a new one.
        </p>
        <div className="flex items-center gap-6 mt-5">
          <button onClick={onNewDM} className="flex flex-col items-center gap-1.5 group">
            <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-600 text-muted-foreground transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">New DM</span>
          </button>
          <button onClick={onNewChannel} className="flex flex-col items-center gap-1.5 group">
            <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-600 text-muted-foreground transition-colors">
              <Hash className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Channel</span>
          </button>
          <button onClick={onSearch} className="flex flex-col items-center gap-1.5 group">
            <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-600 text-muted-foreground transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
