"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TruncatedText } from "@/components/ui/truncated-text";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/shared";
import { useKbPagesSearch, useKbSpaces, useMoveKbPage } from "@/hooks/api/kb";
import type { KbPageSearchResult, MoveKbPageInput } from "@/hooks/api/kb/page-types";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  KbMoveRightIcon,
  KbFileTextIcon,
  KbSearchIcon,
} from "@/features/wiki/lib/kb-icons";

type MoveTarget = Omit<MoveKbPageInput, "index">;

const SPACE_OPTION_LIMIT = 100;

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
  const [target, setTarget] = useState<MoveTarget>({ parentPageId: currentParentId });
  const [searchQuery, setSearchQuery] = useState("");
  const { data: spacePage } = useKbSpaces({ limit: SPACE_OPTION_LIMIT });
  const spaces = spacePage?.data ?? [];

  const { data: searchResults, isLoading: searching, isError: searchError, error, refetch } =
    useKbPagesSearch(searchQuery);

  const results: KbPageSearchResult[] =
    searchResults?.items.filter((r) => r.id !== pageId) ?? [];

  function handleConfirm() {
    movePage.mutate(
      { pageId, ...target, index: 0 },
      {
        onSuccess: () => {
          toast.success("Page moved");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleSelectRoot() {
    setTarget({ parentPageId: null });
  }

  function handleSpaceButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.spaceId;
    if (!id) return;
    setTarget({ parentPageId: null, spaceId: Number(id) });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
  }

  function handleNodeButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.nodeId;
    if (!id) return;
    setTarget({ parentPageId: Number(id) });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleRetrySearch() {
    void refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KbMoveRightIcon className="h-4 w-4" />
            Move page
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose a space to move the page to its top level, or search for the page that should become the new parent.
          </DialogDescription>
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
              type="button"
              aria-pressed={target.parentPageId === null && target.spaceId === undefined}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                target.parentPageId === null && target.spaceId === undefined
                  ? "bg-primary/10 text-foreground font-medium"
                  : "hover:bg-muted"
              }`}
              onClick={handleSelectRoot}
            >
              Workspace root
            </button>
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                data-space-id={String(space.id)}
                aria-pressed={target.spaceId === space.id}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  target.spaceId === space.id
                    ? "bg-primary/10 text-foreground font-medium"
                    : "hover:bg-muted"
                }`}
                onClick={handleSpaceButtonClick}
              >
                <span className="shrink-0 text-base leading-none">{space.icon || "📚"}</span>
                <TruncatedText text={`Top of ${space.name}`} />
              </button>
            ))}
            {searching && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!searching && searchError && searchQuery.length > 0 && (
              <ErrorState
                title="Couldn't search pages"
                description={getErrorMessage(error)}
                error={error}
                onRetry={handleRetrySearch}
                compact
              />
            )}
            {!searching && !searchError && searchQuery.length > 0 && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No pages found
              </div>
            )}
            {!searching && !searchError &&
              results.map((page) => (
                <button
                  key={page.id}
                  data-node-id={String(page.id)}
                  className={`w-full text-left py-2 px-3 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    target.parentPageId === page.id
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
