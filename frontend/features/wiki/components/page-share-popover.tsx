"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  KbBuilding2Icon,
  KbCheckIcon,
  KbLockIcon,
  KbShare2Icon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { useSetKbPageVisibility } from "@/hooks/api/kb/pages";
import { useKbSharingSettings, useKbSpaceSharingPolicy } from "@/hooks/api/kb/sharing";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { cn } from "@/lib/utils";
import { PageShareGuests } from "./sharing/page-share-guests";
import { PageShareLinks } from "./sharing/page-share-links";

const PageGrantsSheet = dynamic(() => import("./page-grants-sheet"));

type Visibility = "private" | "org";

const VISIBILITY_OPTIONS: Array<{
  value: Visibility;
  icon: AnimatedNavIconComponent;
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
];

interface PageSharePopoverProps {
  page: KbPageDetail;
}

export default function PageSharePopover({ page }: PageSharePopoverProps) {
  const [open, setOpen] = useState(false);
  const [grantsOpen, setGrantsOpen] = useState(false);
  const setVisibility = useSetKbPageVisibility();
  const { data: sharingSettings } = useKbSharingSettings();
  const spaceId = page.spaceId ?? 0;
  const { data: spacePolicy } = useKbSpaceSharingPolicy(spaceId);

  const rawVisibility = page.visibility;
  const currentVisibility: Visibility =
    rawVisibility === "private" ? "private" : "org";

  const effectiveMode =
    spacePolicy?.effective ?? sharingSettings?.externalSharing ?? "disabled";
  const linksEnabled = effectiveMode === "guests_and_links";
  const guestsEnabled = effectiveMode === "guests" || effectiveMode === "guests_and_links";

  function handleVisibilitySelect(e: React.MouseEvent<HTMLButtonElement>) {
    const selectedVisibility = e.currentTarget.dataset.visibility;
    const value = VISIBILITY_OPTIONS.find(
      (option) => option.value === selectedVisibility,
    )?.value;
    if (!value || value === currentVisibility) return;
    setVisibility.mutate(
      { pageId: page.id, visibility: value, expectedContentRevision: page.contentRevision },
      {
        onSuccess: () => toast.success("Visibility updated"),
        onError: (error) => toast.error(isApiError(error) && error.status === 409
          ? "File changed before visibility was saved. Refresh before trying again."
          : "Failed to update visibility"),
      },
    );
  }

  function handleVisibilityKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = radios.findIndex((radio) => radio === document.activeElement);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    radios[(current + step + radios.length) % radios.length]?.focus();
  }

  function handleOpenGrants() {
    setOpen(false);
    setGrantsOpen(true);
  }

  return (
    <>
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 px-0"
          aria-label="Share file"
        >
          <KbShare2Icon className="h-4 w-4" />
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        sideOffset={6}
        title="Share"
        className="w-64 max-w-[90vw] gap-0 p-1.5"
      >
        <div
          role="radiogroup"
          aria-label="File visibility"
          className="flex flex-col gap-0.5"
          onKeyDown={handleVisibilityKeyDown}
        >
          {VISIBILITY_OPTIONS.map(
            ({ value, icon: Icon, label, description }) => {
              const selected = currentVisibility === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
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

        <div className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            onClick={handleOpenGrants}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
          >
            <KbUsersIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Manage access</span>
          </button>
        </div>

        {page.can.manage && (
          <>
            <div className="mt-1 border-t border-border px-2 pt-2 pb-1">
              <p className="text-xs font-medium text-foreground mb-1.5">Guest access</p>
              <PageShareGuests pageId={page.id} externalSharingEnabled={guestsEnabled} />
            </div>
            {linksEnabled && (
              <div className="border-t border-border px-2 pt-2 pb-1">
                <p className="text-xs font-medium text-foreground mb-1.5">Share links</p>
                <PageShareLinks pageId={page.id} externalSharingEnabled={linksEnabled} />
              </div>
            )}
          </>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>

    <PageGrantsSheet
      pageId={page.id}
      open={grantsOpen}
      onOpenChange={setGrantsOpen}
    />
    </>
  );
}
