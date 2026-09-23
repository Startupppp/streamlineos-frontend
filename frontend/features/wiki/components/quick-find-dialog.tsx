"use client";

import { useState, useCallback, useRef } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { useKbPagesSearch } from "@/hooks/api/kb";
import type { KbPageSearchResult } from "@/hooks/api/kb/page-types";
import { pageHref, KB_SEARCH } from "@/lib/knowledge-routes";
import { KbFileTextIcon, KbLoader2Icon } from "@/features/wiki/lib/kb-icons";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SearchSnippetText } from "@/features/wiki/lib/search-snippet-text";

interface QuickFindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickFindDialog({ open, onOpenChange }: QuickFindDialogProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const debouncedQ = useDebouncedValue(inputValue.trim(), 300);
  const { data: page, isFetching } = useKbPagesSearch(debouncedQ);
  const results = page?.items ?? [];
  const resultsRef = useRef<KbPageSearchResult[]>([]);
  resultsRef.current = results;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setInputValue("");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleResultSelect = useCallback(
    (value: string) => {
      const id = Number(value.split("-")[0]);
      const result = resultsRef.current.find((r) => r.id === id);
      if (!result) return;
      router.push(pageHref(result.id));
      handleOpenChange(false);
    },
    [router, handleOpenChange]
  );

  function handleInputValueChange(value: string) {
    setInputValue(value);
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Search pages…"
        value={inputValue}
        onValueChange={handleInputValueChange}
      />
      <CommandList>
        {isFetching && debouncedQ.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <KbLoader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isFetching && debouncedQ.length > 0 && results.length === 0 && (
          <CommandEmpty>No pages found for &ldquo;{debouncedQ}&rdquo;</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Pages">
            {results.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.id}-${result.title}`}
                onSelect={handleResultSelect}
              >
                <span className="mr-2 text-base">
                  {result.icon ?? <KbFileTextIcon className="h-4 w-4" />}
                </span>
                <div className="flex flex-col min-w-0">
                  <TruncatedText text={result.title || "Untitled"} className="font-medium" />
                  {result.snippet && (
                    <SearchSnippetText
                      snippet={result.snippet}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </div>
              </CommandItem>
            ))}
            {page?.hasMore && (
              <CommandItem
                value="__view-all-results__"
                onSelect={() => {
                  router.push(`${KB_SEARCH}?q=${encodeURIComponent(debouncedQ)}`);
                  handleOpenChange(false);
                }}
                className="justify-center text-xs text-muted-foreground"
              >
                View all results for &ldquo;{debouncedQ}&rdquo;
              </CommandItem>
            )}
          </CommandGroup>
        )}
        {debouncedQ.length === 0 && (
          <CommandEmpty>Start typing to search pages…</CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
