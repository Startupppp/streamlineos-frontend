"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useModuleMemberCandidates } from "@/hooks/api/module-access";

const PAGE_SIZE = 20;

interface MemberCandidateSelectProps {
  moduleKey: string;
  value: string;
  onValueChange: (userId: string) => void;
  enabled?: boolean;
  defaultUserId?: string;
  excludeAssigned?: boolean;
  excludedUserId?: string;
}

export function MemberCandidateSelect({
  moduleKey,
  value,
  onValueChange,
  enabled = true,
  defaultUserId,
  excludeAssigned = true,
  excludedUserId,
}: MemberCandidateSelectProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pinnedUserId, setPinnedUserId] = useState(defaultUserId);
  const debouncedSearch = useDebouncedValue(search, 300);
  const candidatesQuery = useModuleMemberCandidates(
    moduleKey,
    page,
    PAGE_SIZE,
    debouncedSearch,
    { enabled, userId: pinnedUserId, excludeAssigned },
  );
  const candidates = (candidatesQuery.data?.data ?? []).filter(
    (candidate) => candidate.userId !== excludedUserId,
  );
  const pagination = candidatesQuery.data?.pagination;

  useEffect(() => {
    setPinnedUserId(defaultUserId);
    setPage(1);
  }, [defaultUserId]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
      setPinnedUserId(undefined);
      setPage(1);
    },
    [],
  );

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={handleSearchChange}
        placeholder="Search members…"
        className="h-9"
      />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue placeholder="Select a user…" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {candidatesQuery.isLoading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">Loading…</div>
          ) : candidates.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No eligible members found
            </div>
          ) : (
            candidates.map((candidate) => (
              <SelectItem key={candidate.userId} value={candidate.userId}>
                {candidate.displayName || candidate.email}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {pagination && pagination.total > PAGE_SIZE ? (
        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={pagination.total}
          onPageChange={setPage}
          disabled={candidatesQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
