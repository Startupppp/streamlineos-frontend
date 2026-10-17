"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { getUserDisplayName } from "@/lib/person-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import {
  OptionRow,
  FilterMenuSearch,
  PanelShell,
  EmptyHint,
} from "@/components/list-view";
import { FilterAssigneeLeading } from "./filter-option-leading";

interface AssigneeFilterSubmenuProps {
  selectedAssignees: string[];
  onToggleAssignee: (id: string) => void;
  onClose: () => void;
  showTitle?: boolean;
  className?: string;
  listClassName?: string;
}

const FIXED_OPTIONS = [
  { id: "@me", displayName: "Me (dynamic)" },
  { id: "__unassigned__", displayName: "Unassigned" },
] as const;

export function AssigneeFilterSubmenu({
  selectedAssignees,
  onToggleAssignee,
  onClose,
  showTitle = true,
  className,
  listClassName = "max-h-[min(50dvh,320px)] overflow-y-auto scrollbar-hide p-1",
}: AssigneeFilterSubmenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: membersData, isLoading } = useBuildMembers(
    debouncedSearch ? { search: debouncedSearch } : undefined,
  );
  const members = membersData?.data ?? [];

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <PanelShell
      category="assignee"
      containerRef={containerRef}
      onKeyDown={handleKeyDown}
      withSearch
      showTitle={showTitle}
      className={className}
    >
      <FilterMenuSearch
        value={search}
        onValueChange={setSearch}
        placeholder="Search assignees…"
      />
      <div className={listClassName}>
        {FIXED_OPTIONS.map((opt) => {
          function handleClick() {
            onToggleAssignee(opt.id);
          }
          return (
            <OptionRow
              key={opt.id}
              active={selectedAssignees.includes(opt.id)}
              label={opt.displayName}
              leading={<FilterAssigneeLeading assigneeId={opt.id} />}
              onClick={handleClick}
            />
          );
        })}
        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>Loading…</span>
          </div>
        ) : members.length === 0 && debouncedSearch ? (
          <EmptyHint message="No members found" />
        ) : (
          members.map((m) => {
            const displayName = getUserDisplayName(m);
            function handleClick() {
              onToggleAssignee(m.id);
            }
            return (
              <OptionRow
                key={m.id}
                active={selectedAssignees.includes(m.id)}
                label={displayName}
                leading={<FilterAssigneeLeading assigneeId={m.id} member={m} />}
                onClick={handleClick}
              />
            );
          })
        )}
      </div>
    </PanelShell>
  );
}
