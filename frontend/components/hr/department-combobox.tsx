"use client";

import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useHrDepartments, useCreateDepartment } from "@/hooks/api/hr";
import { useCan, useCanState } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface DepartmentComboboxProps {
  value?: string | null;
  onValueChange: (value: string | undefined) => void;
  departments?: ReadonlyArray<{ id: string; name: string }>;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  className?: string;
}

interface DepartmentOptionProps {
  dept: { id: string; name: string };
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const DepartmentOption = memo(function DepartmentOption({
  dept,
  isSelected,
  onSelect,
}: DepartmentOptionProps) {
  const handleClick = useCallback(() => onSelect(dept.id), [onSelect, dept.id]);
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
      )}
      onClick={handleClick}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="truncate">{dept.name}</span>
    </button>
  );
});

export function DepartmentCombobox({
  value,
  onValueChange,
  departments: providedDepartments,
  placeholder = "Select Department",
  disabled = false,
  allowCreate = true,
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [justCreated, setJustCreated] = useState<
    ReadonlyArray<{ id: string; name: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selfLoading = providedDepartments === undefined;
  const { data: loadedDepartments = [], isLoading: listLoading } =
    useHrDepartments({ enabled: selfLoading });
  // FE-47: the picker's own read is disabled without hr:employees:view, which
  // looks exactly like an empty list. Say "denied", not "no departments".
  const listAccess = useCanState("hr:employees:view");
  const listDenied = selfLoading && listAccess === "denied";
  const canCreate = useCan("hr:employees:manage");
  const createDepartment = useCreateDepartment();

  const departments = useMemo(() => {
    const known = providedDepartments ?? loadedDepartments;
    const missing = justCreated.filter(
      (candidate) => !known.some((d) => d.id === candidate.id),
    );
    return missing.length === 0 ? known : [...known, ...missing];
  }, [providedDepartments, loadedDepartments, justCreated]);

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === value),
    [departments, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.trim().toLowerCase();
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  const exactMatch = useMemo(
    () =>
      departments.some(
        (d) => d.name.toLowerCase() === search.trim().toLowerCase(),
      ),
    [departments, search],
  );
  const canAdd =
    allowCreate &&
    canCreate &&
    search.trim().length > 0 &&
    !exactMatch &&
    !createDepartment.isPending;

  useEffect(() => {
    if (open) {
      setSearch("");
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      onValueChange(id);
      setOpen(false);
    },
    [onValueChange],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") setOpen(false);
    },
    [],
  );

  const handleAdd = useCallback(() => {
    const name = search.trim();
    if (!name) return;
    createDepartment.mutate(
      { name },
      {
        onSuccess: (created) => {
          setJustCreated((current) =>
            current.some((d) => d.id === created.id)
              ? current
              : [...current, created],
          );
          onValueChange(created.id);
          setOpen(false);
          setSearch("");
          toast.success(`Department "${created.name}" added`);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [search, createDepartment, onValueChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder ?? "Select department"}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal border-input bg-card data-[placeholder]:text-muted-foreground",
            !selectedDept && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedDept ? selectedDept.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="flex flex-col gap-1 p-2">
          <Input
            ref={inputRef}
            placeholder="Search or add department..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className=""
          />
        </div>
        <ScrollArea className="max-h-[240px]">
          <div className="p-1">
            {filtered.map((dept) => (
              <DepartmentOption
                key={dept.id}
                dept={dept}
                isSelected={value === dept.id}
                onSelect={handleSelect}
              />
            ))}
            {canAdd && (
              <button
                type="button"
                className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add &quot;{search.trim()}&quot;</span>
              </button>
            )}
            {filtered.length === 0 && !canAdd && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {listDenied
                  ? "You don't have permission to view departments."
                  : selfLoading && listLoading
                  ? "Loading departments…"
                  : departments.length === 0
                  ? allowCreate && canCreate
                    ? "No departments yet — type a name above to create one."
                    : "No departments yet. Ask an HR admin to add one."
                  : "No department matches that search."}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
