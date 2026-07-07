"use client";

import { useState } from "react";
import {
  KbBuilding2Icon,
  KbCheckIcon,
  KbCopyIcon,
  KbGlobeIcon,
  KbLockIcon,
  KbShare2Icon,
  type KbIconComponent,
} from "@/features/knowledge-base/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useSetKbPageVisibility } from "@/hooks/api/kb/pages";
import type { KbPageDetail } from "@/hooks/api/kb/pages";

type Visibility = "private" | "org" | "public";

const VISIBILITY_OPTIONS: Array<{
  value: Visibility;
  icon: KbIconComponent;
  label: string;
  description: string;
}> = [
  { value: "private", icon: KbLockIcon, label: "Private", description: "Only you can access" },
  { value: "org", icon: KbBuilding2Icon, label: "Team", description: "Everyone in the workspace" },
  { value: "public", icon: KbGlobeIcon, label: "Public", description: "Anyone with the link" },
];

interface PageSharePopoverProps {
  page: KbPageDetail;
}

export default function PageSharePopover({ page }: PageSharePopoverProps) {
  const [open, setOpen] = useState(false);
  const setVisibility = useSetKbPageVisibility();

  const currentVisibility: Visibility = page.visibility ?? "private";

  function handleVisibilitySelect(e: React.MouseEvent<HTMLButtonElement>) {
    const value = e.currentTarget.dataset.visibility as Visibility | undefined;
    if (!value || value === currentVisibility) return;
    setVisibility.mutate(
      { pageId: page.id, visibility: value },
      {
        onSuccess: () => toast.success(`Visibility updated`),
        onError: () => toast.error("Failed to update visibility"),
      },
    );
  }

  function handleCopyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/wiki/${page.publicToken ?? ""}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Failed to copy"),
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/wiki/${page.publicToken ?? ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Share page">
              <KbShare2Icon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="text-xs font-medium">
          Share
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 max-w-[85vw] p-0">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-foreground">Share</p>
        </div>
        <div className="px-2 pb-2">
          {VISIBILITY_OPTIONS.map(({ value, icon: Icon, label, description }) => (
            <button
              key={value}
              type="button"
              data-visibility={value}
              className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-left hover:bg-muted transition-colors disabled:opacity-50"
              onClick={handleVisibilitySelect}
              disabled={setVisibility.isPending}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
              {currentVisibility === value && (
                <KbCheckIcon className="h-4 w-4 shrink-0 text-blue-600" />
              )}
            </button>
          ))}
        </div>
        {currentVisibility === "public" && page.publicToken && (
          <>
            <div className="h-px bg-border mx-4" />
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5">
                <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                  {publicUrl}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 shrink-0 text-xs"
                  onClick={handleCopyLink}
                >
                  <KbCopyIcon className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
