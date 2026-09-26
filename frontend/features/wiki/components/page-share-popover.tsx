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
} from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import { toast } from "sonner";
import { useSetKbPageVisibility } from "@/hooks/api/kb/pages";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { cn } from "@/lib/utils";

type Visibility = "private" | "org" | "public";

const VISIBILITY_OPTIONS: Array<{
  value: Visibility;
  icon: KbIconComponent;
  label: string;
  description: string;
}> = [
  {
    value: "private",
    icon: KbLockIcon,
    label: "Private",
    description: "Only you",
  },
  {
    value: "org",
    icon: KbBuilding2Icon,
    label: "Team",
    description: "Org members",
  },
  {
    value: "public",
    icon: KbGlobeIcon,
    label: "Public",
    description: "Anyone with link",
  },
];

interface PageSharePopoverProps {
  page: KbPageDetail;
}

export default function PageSharePopover({ page }: PageSharePopoverProps) {
  const [open, setOpen] = useState(false);
  const setVisibility = useSetKbPageVisibility();

  const currentVisibility: Visibility = page.visibility ?? "private";

  function handleVisibilitySelect(e: React.MouseEvent<HTMLButtonElement>) {
    const selectedVisibility = e.currentTarget.dataset.visibility;
    const value = VISIBILITY_OPTIONS.find(
      (option) => option.value === selectedVisibility,
    )?.value;
    if (!value || value === currentVisibility) return;
    setVisibility.mutate(
      { pageId: page.id, visibility: value },
      {
        onSuccess: () => toast.success("Visibility updated"),
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
  const showPublicLink =
    currentVisibility === "public" && Boolean(page.publicToken);

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 px-0"
          aria-label="Share page"
        >
          <KbShare2Icon className="h-4 w-4" />
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        sideOffset={6}
        title="Share"
        className="w-56 max-w-[85vw] gap-0 p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          {VISIBILITY_OPTIONS.map(
            ({ value, icon: Icon, label, description }) => {
              const selected = currentVisibility === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-visibility={value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                    "hover:bg-muted disabled:opacity-50",
                    selected && "bg-muted/70",
                  )}
                  onClick={handleVisibilitySelect}
                  disabled={setVisibility.isPending}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium leading-tight text-foreground">
                      {label}
                    </span>
                    <span className="block text-micro leading-tight text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {selected ? (
                    <KbCheckIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              );
            },
          )}
        </div>

        {showPublicLink ? (
          <div className="mt-1 flex items-center gap-1 border-t border-border pt-1.5">
            <TruncatedText
              text={publicUrl}
              className="min-w-0 flex-1 px-1 text-micro text-muted-foreground"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleCopyLink}
              aria-label="Copy link"
            >
              <KbCopyIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
