"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TruncatedText } from "@/components/ui/truncated-text";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKbPagesSearch, useMoveKbPage } from "@/hooks/api/kb";
import type { KbPageSearchResult } from "@/hooks/api/kb/page-types";
import {
  KbMoveRightIcon,
  KbFileTextIcon,
  KbSearchIcon,
} from "@/features/wiki/lib/kb-icons";

interface MovePageDialogProps {
  pageId: number;
  currentParentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MovePageDialog({
  pageId,
  currentParentId,
  open,
  onOpenChange,
}: MovePageDialogProps) {
  const movePage = useMoveKbPage();
  const [selectedParent, setSelectedParent] = useState<number | null>(
    currentParentId,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults, isLoading: searching } =
    useKbPagesSearch(searchQuery);

  const results: KbPageSearchResult[] =
    searchResults?.items.filter((r) => r.id !== pageId) ?? [];

  function handleConfirm() {
    movePage.mutate(
      { pageId, parentPageId: selectedParent, index: 0 },
      {
        onSuccess: () => {
          toast.success("Page moved");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to move page"),
      },
    );
  }

  function handleSelectRoot() {
    setSelectedParent(null);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
  }

  function handleNodeButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.nodeId;
    if (!id) return;
    setSelectedParent(Number(id));
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KbMoveRightIcon className="h-4 w-4" />
            Move page
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <KbSearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search pages…"
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-8 text-sm"
          />
        </div>
        <ScrollArea className="h-64 border border-border rounded-lg">
          <div className="p-2 space-y-0.5">
            <button
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedParent === null
                  ? "bg-primary/10 text-foreground font-medium"
                  : "hover:bg-muted"
              }`}
              onClick={handleSelectRoot}
            >
              Workspace root
            </button>
            {searching && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!searching && searchQuery.length > 0 && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No pages found
              </div>
            )}
            {!searching &&
              results.map((page) => (
                <button
                  key={page.id}
                  data-node-id={String(page.id)}
                  className={`w-full text-left py-2 px-3 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedParent === page.id
                      ? "bg-primary/10 text-foreground font-medium"
                      : "hover:bg-muted"
                  }`}
                  onClick={handleNodeButtonClick}
                >
                  <span className="shrink-0 text-base leading-none">
                    {page.icon ?? <KbFileTextIcon className="h-3.5 w-3.5" />}
                  </span>
                  <TruncatedText text={page.title || "Untitled"} />
                </button>
              ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            onClick={handleConfirm}
            isPending={movePage.isPending}
            loadingText="Moving…"
          >
            Move here
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
