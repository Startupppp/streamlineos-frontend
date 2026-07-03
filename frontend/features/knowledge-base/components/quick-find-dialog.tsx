"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { useKbPagesSearch } from "@/hooks/api/kb";
import type { KbPageSearchResult } from "@/hooks/api/kb/pages";

interface QuickFindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickFindDialog({ open, onOpenChange }: QuickFindDialogProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const { data: results = [], isFetching } = useKbPagesSearch(debouncedQ);
  const resultsRef = useRef<KbPageSearchResult[]>([]);
  resultsRef.current = results;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(inputValue.trim()), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setInputValue("");
        setDebouncedQ("");
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
      router.push(`/knowledge-base/pages/${result.id}`);
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
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                  {result.icon ?? <FileText className="h-4 w-4" />}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{result.title || "Untitled"}</span>
                  {result.snippet && (
                    <span className="text-xs text-muted-foreground truncate">
                      {result.snippet}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {debouncedQ.length === 0 && (
          <CommandEmpty>Start typing to search pages…</CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
