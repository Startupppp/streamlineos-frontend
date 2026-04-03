"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { useHrDepartments, useCreateDepartment } from "@/lib/api/hooks/hr";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface DepartmentComboboxProps {
  value?: number | null;
  onValueChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  className?: string;
}

export function DepartmentCombobox({
  value,
  onValueChange,
  placeholder = "Select Department",
  disabled = false,
  allowCreate = true,
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: departments = [] } = useHrDepartments();
  const createDepartment = useCreateDepartment();

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === value),
    [departments, value]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.trim().toLowerCase();
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  const exactMatch = useMemo(
    () =>
      departments.some(
        (d) => d.name.toLowerCase() === search.trim().toLowerCase()
      ),
    [departments, search]
  );
  const canAdd =
    allowCreate &&
    search.trim().length > 0 &&
    !exactMatch &&
    !createDepartment.isPending;

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (id: number) => {
    onValueChange(id);
    setOpen(false);
  };

  const handleAdd = () => {
    const name = search.trim();
    if (!name) return;
    createDepartment.mutate(
      { name },
      {
        onSuccess: async () => {
          await qc.invalidateQueries({ queryKey: queryKeys.hr.departments() });
          const list = await qc.fetchQuery({
            queryKey: queryKeys.hr.departments(),
            queryFn: async () => {
              const result = await qc.getQueryData<{ id: number; name: string }[]>(queryKeys.hr.departments());
              return result ?? [];
            },
          });
          const found = list?.find((d: { id: number; name: string }) => d.name === name);
          if (found) {
            onValueChange(found.id);
          }
          setOpen(false);
          setSearch("");
          toast.success(`Department "${name}" added`);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to add department");
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal border-input data-[placeholder]:text-muted-foreground",
            !selectedDept && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedDept ? selectedDept.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex flex-col gap-1 p-2">
          <Input
            ref={inputRef}
            placeholder="Search or add department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-9"
          />
        </div>
        <ScrollArea className="max-h-[240px]">
          <div className="p-1">
            {filtered.map((dept) => (
              <button
                key={dept.id}
                type="button"
                className={cn(
                  "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === dept.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleSelect(dept.id)}
              >
                <Check
                  className={cn("h-4 w-4 shrink-0", value === dept.id ? "opacity-100" : "opacity-0")}
                />
                <span className="truncate">{dept.name}</span>
              </button>
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
                No department found. Type to search or add a new one.
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
