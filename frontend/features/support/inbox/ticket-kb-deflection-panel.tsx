"use client";

import { useState, useCallback } from "react";
import { ChevronDown, BookOpen, ExternalLink, FilePlus } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbSearch, useKbSpaces } from "@/hooks/api/kb";
import { useCreateKbArticleFromTicket } from "@/hooks/api/kb/from-ticket";

interface KbDeflectionPanelProps {
  ticketId: number;
  ticketTitle: string;
}

export function KbDeflectionPanel({ ticketId, ticketTitle }: KbDeflectionPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const { data: searchData, isLoading: searchLoading } = useKbSearch(
    { q: ticketTitle, pageSize: 4 },
    { enabled: open },
  );
  const { data: spaces } = useKbSpaces();
  const { mutate: createMutate, isPending: createPending } = useCreateKbArticleFromTicket();

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleSpaceChange = useCallback((v: string) => setSelectedSpaceId(v), []);

  const handleCreate = useCallback(() => {
    if (!selectedSpaceId) return;
    createMutate(
      { ticketId, spaceId: Number(selectedSpaceId) },
      {
        onSuccess: () => {
          toast.success("Draft article created — check the KB for your new draft");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [selectedSpaceId, ticketId, createMutate]);

  const articles = searchData?.items ?? [];

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-dense font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        KB Deflection
        <ChevronDown
          className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          <div>
            <p className="text-dense font-semibold text-foreground/80 mb-1.5">Related articles</p>
            {searchLoading ? (
              <div className="space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse w-3/4" />
                ))}
              </div>
            ) : articles.length > 0 ? (
              <ul className="space-y-1">
                {articles.map((article) => (
                  <li key={article.id}>
                    <a
                      href={`/support/kb/${article.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 min-w-0 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{article.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedSpaceId}
              onValueChange={handleSpaceChange}
              disabled={!spaces?.length}
            >
              <SelectTrigger className="h-9 text-sm flex-1 min-w-0">
                <SelectValue placeholder="Select space" />
              </SelectTrigger>
              <SelectContent>
                {(spaces ?? []).map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0 whitespace-nowrap"
              disabled={!selectedSpaceId || !spaces?.length}
              isPending={createPending}
              onClick={handleCreate}
            >
              {!createPending && <FilePlus className="h-3.5 w-3.5 mr-1" />}
              Create KB article
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
