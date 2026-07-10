"use client";

import { useState, useMemo } from "react";
import { Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";

interface ProjectMemberSelectSingleProps {
  projectId: number;
  mode: "single";
  value?: string;
  onChange?: (userId: string | null) => void;
  values?: never;
  onToggle?: never;
  allowUnassigned?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ProjectMemberSelectMultiProps {
  projectId: number;
  mode: "multi";
  value?: never;
  onChange?: never;
  values?: string[];
  onToggle?: (userId: string) => void;
  allowUnassigned?: never;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type ProjectMemberSelectProps = ProjectMemberSelectSingleProps | ProjectMemberSelectMultiProps;

export function ProjectMemberSelect(props: ProjectMemberSelectProps) {
  const { projectId, mode, placeholder = "Select member…", disabled, className } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = useProjectMembers(projectId);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        getUserDisplayName(m).toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  if (mode === "single") {
    const { value, onChange, allowUnassigned } = props;
    const selected = value ? members.find((m) => m.id === value) : null;

    function handleSelect(userId: string | null) {
      onChange?.(userId);
      setOpen(false);
      setSearch("");
    }

    function handleSearchChange(v: string) {
      setSearch(v);
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "h-8 w-full justify-start gap-2 text-xs font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            {selected ? (
              <>
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={resolveImageUrl(selected.image)} />
                  <AvatarFallback className="text-[7px]">{getUserInitials(selected)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{getUserDisplayName(selected)}</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>{placeholder}</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search members…"
              className="h-8 text-xs"
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-52">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                No members found.
              </CommandEmpty>
              <CommandGroup>
                {allowUnassigned && (
                  <CommandItem value="__unassigned__" onSelect={() => handleSelect(null)}>
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">Unassigned</span>
                    {!value && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                )}
                {filtered.map((m) => (
                  <CommandItem key={m.id} value={m.id} onSelect={() => handleSelect(m.id)}>
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(m.image)} />
                      <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                    {m.id === value && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  const { values = [], onToggle } = props;

  function handleToggle(userId: string) {
    onToggle?.(userId);
  }

  function handleSearchChange(v: string) {
    setSearch(v);
  }

  const selectedMembers = members.filter((m) => values.includes(m.id));

  return (
    <div className={cn("space-y-1.5", className)}>
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map((m) => (
            <Badge key={m.id} variant="secondary" className="gap-1.5 pl-0.5 pr-1.5 py-0.5">
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={resolveImageUrl(m.image)} />
                <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] truncate max-w-[120px]">{getUserDisplayName(m)}</span>
              <button
                type="button"
                className="text-muted-foreground/70 hover:text-destructive transition-colors leading-none"
                onClick={() => handleToggle(m.id)}
                aria-label={`Remove ${getUserDisplayName(m)}`}
              >
                <span className="text-xs font-bold">&times;</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="h-8 w-full justify-start gap-2 text-xs font-normal text-muted-foreground"
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search members…"
              className="h-8 text-xs"
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-52">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                No members found.
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((m) => (
                  <CommandItem key={m.id} value={m.id} onSelect={() => handleToggle(m.id)}>
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(m.image)} />
                      <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                    {values.includes(m.id) && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
