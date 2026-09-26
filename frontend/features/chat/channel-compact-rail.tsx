"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CompassIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";

const RAIL_ICON_SIZE = 14;

interface CompactRailButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function CompactRailButton({ label, icon, onClick }: CompactRailButtonProps) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface ChannelCompactRailProps {
  isCollapsed: boolean;
  onSearchOpen: () => void;
  onBrowseOpen: () => void;
  onNewDMOpen: () => void;
  onNewGroupOpen: () => void;
}

export function ChannelCompactRail({
  isCollapsed,
  onSearchOpen,
  onBrowseOpen,
  onNewDMOpen,
  onNewGroupOpen,
}: ChannelCompactRailProps) {
  return (
    <div
      className={cn(
        "relative z-20 hidden flex-col items-center gap-2 px-1.5 pt-2 pb-2 shrink-0",
        isCollapsed && "lg:flex",
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <CompactRailButton
          label="Search"
          icon={<SearchIcon size={RAIL_ICON_SIZE} />}
          onClick={onSearchOpen}
        />
        <CompactRailButton
          label="Browse Channels"
          icon={<CompassIcon size={RAIL_ICON_SIZE} />}
          onClick={onBrowseOpen}
        />
        <CompactRailButton
          label="New Direct Message"
          icon={<PlusIcon size={RAIL_ICON_SIZE} />}
          onClick={onNewDMOpen}
        />
        <CompactRailButton
          label="New Channel"
          icon={<UsersIcon size={RAIL_ICON_SIZE} />}
          onClick={onNewGroupOpen}
        />
      </div>
    </div>
  );
}
