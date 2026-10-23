"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { KbFolderOpenIcon, KbPlusIcon } from "@/features/wiki/lib/kb-icons";
import PageTree from "./page-tree";
import WikiSidebarNav from "./wiki-sidebar-nav";

export function WikiMobileChrome({
  canViewSpaces,
  createPending,
  onNewPage,
}: {
  canViewSpaces: boolean;
  createPending: boolean;
  onNewPage: () => void;
}) {
  const [filesOpen, setFilesOpen] = useState(false);

  function handleOpenFiles() {
    setFilesOpen(true);
  }

  function handleFilesOpenChange(open: boolean) {
    setFilesOpen(open);
  }

  function handleCloseFiles() {
    setFilesOpen(false);
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-card/50 px-2 py-1.5 md:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5 px-2.5"
        onClick={handleOpenFiles}
      >
        <KbFolderOpenIcon className="size-4" />
        Files
      </Button>
      <WikiSidebarNav variant="bar" canViewSpaces={canViewSpaces} />
      <AnimatedIconButton
        type="button"
        variant="ghost"
        size="icon"
        icon={KbPlusIcon}
        iconSize={16}
        className="size-9 shrink-0"
        onClick={onNewPage}
        disabled={createPending}
        aria-label="New document"
      />
      <Sheet open={filesOpen} onOpenChange={handleFilesOpenChange}>
        <SheetContent side="left" className="w-[min(100vw-2.5rem,20rem)] gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Files</SheetTitle>
            <SheetDescription>Browse documents in this workspace.</SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 flex-1 overflow-y-auto p-2">
            {filesOpen ? <PageTree onCloseMobile={handleCloseFiles} /> : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
