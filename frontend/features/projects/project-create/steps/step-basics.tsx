"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronDown, User } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useOrgMembers } from "@/hooks/api/organization";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { generateProjectKey } from "../generate-project-key";
import { basicsSchema, PROJECT_NAME_MAX, PROJECT_KEY_MAX, PROJECT_DESCRIPTION_MAX } from "../project-create-schema";
import type { BasicsValues } from "../project-create-schema";
import type { StepSharedProps } from "../use-project-create";

const NONE_SENTINEL = "__none__";

function charCounter(current: string | undefined, max: number) {
  const len = (current ?? "").length;
  const near = len >= Math.floor(max * 0.85);
  const over = len > max;
  if (!near && !over) return null;
  return (
    <span className={over ? "text-destructive" : "text-muted-foreground"}>
      {len}/{max}
    </span>
  );
}

export type BasicsHandle = {
  validate: () => Promise<boolean>;
};

export const StepBasics = forwardRef<BasicsHandle, StepSharedProps>(
  function StepBasicsRender({ draft, updateDraft }, ref) {
    const { data: membersData } = useOrgMembers(1, 100);
    const { data: clients } = useSimpleClientsList();
    const members = membersData?.data ?? [];
    const clientList = clients ?? [];

    const [managerOpen, setManagerOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState("");

    const filteredManagers = useMemo(() => {
      if (!managerSearch.trim()) return members;
      const q = managerSearch.toLowerCase();
      return members.filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
    }, [members, managerSearch]);

    const form = useForm<BasicsValues>({
      resolver: zodResolver(basicsSchema),
      defaultValues: {
        name: draft.name,
        key: draft.key,
        description: draft.description,
        managerId: draft.managerId || undefined,
        clientId: draft.clientId || undefined,
        startDate: draft.startDate,
        endDate: draft.endDate,
      },
    });

    const keyManuallyEditedRef = useRef(
      draft.key.length > 0 && draft.key !== generateProjectKey(draft.name),
    );

    const watchedStartDate = form.watch("startDate");
    const watchedName = form.watch("name");
    const watchedKey = form.watch("key");
    const watchedDescription = form.watch("description");

    useImperativeHandle(ref, () => ({
      async validate(): Promise<boolean> {
        const ok = await form.trigger();
        if (ok) {
          const v = form.getValues();
          updateDraft({
            name: v.name,
            key: v.key,
            description: v.description ?? "",
            managerId: v.managerId ?? "",
            clientId: v.clientId ?? "",
            startDate: v.startDate ?? "",
            endDate: v.endDate ?? "",
          });
        }
        return ok;
      },
    }));

    function handleFormSubmit(e: React.FormEvent) {
      e.preventDefault();
    }

    function handleNameChange(
      name: string,
      onChange: (value: string) => void,
    ) {
      const capped = name.slice(0, PROJECT_NAME_MAX);
      onChange(capped);
      if (keyManuallyEditedRef.current) {
        return;
      }
      const generated = generateProjectKey(capped);
      form.setValue("key", generated, { shouldValidate: false });
    }

    function handleKeyChange(
      value: string,
      onChange: (value: string) => void,
    ) {
      keyManuallyEditedRef.current = true;
      const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, PROJECT_KEY_MAX);
      onChange(sanitized);
    }

    function handleManagerChange(value: string) {
      form.setValue("managerId", value === NONE_SENTINEL ? undefined : value);
      setManagerOpen(false);
      setManagerSearch("");
    }

    function handleManagerSearchChange(v: string) {
      setManagerSearch(v);
    }

    function handleClientChange(value: string) {
      form.setValue("clientId", value === NONE_SENTINEL ? undefined : value);
    }

    return (
      <Form {...form}>
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Project Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <span className="text-xs">{charCounter(watchedName, PROJECT_NAME_MAX)}</span>
                </div>
                <FormControl>
                  <Input
                    placeholder="e.g. Website Redesign"
                    maxLength={PROJECT_NAME_MAX}
                    {...field}
                    onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Project Key <span className="text-destructive">*</span>
                  </FormLabel>
                  <span className="text-xs">{charCounter(watchedKey, PROJECT_KEY_MAX)}</span>
                </div>
                <FormControl>
                  <Input
                    placeholder="e.g. WR"
                    maxLength={PROJECT_KEY_MAX}
                    {...field}
                    onChange={(e) => handleKeyChange(e.target.value, field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <span className="text-xs">{charCounter(watchedDescription, PROJECT_DESCRIPTION_MAX)}</span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Briefly describe the project goals..."
                    className="resize-none min-h-[80px]"
                    maxLength={PROJECT_DESCRIPTION_MAX}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => {
              const selectedManager = field.value
                ? members.find((m) => m.userId === field.value)
                : null;
              return (
                <FormItem>
                  <FormLabel>
                    Project Manager{" "}
                    <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Popover open={managerOpen} onOpenChange={setManagerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between gap-2 font-normal h-9",
                            !selectedManager && "text-muted-foreground",
                          )}
                        >
                          {selectedManager ? (
                            <span className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-5 w-5 shrink-0">
                                <AvatarImage src={resolveImageUrl(selectedManager.image)} />
                                <AvatarFallback className="text-[7px]">
                                  {getUserInitials({ name: selectedManager.name, email: selectedManager.email })}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm">
                                {getUserDisplayName({ name: selectedManager.name, email: selectedManager.email })}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4 shrink-0" />
                              <span>No manager</span>
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search by name or email…"
                            className="h-8 text-xs"
                            value={managerSearch}
                            onValueChange={handleManagerSearchChange}
                          />
                          <CommandList className="max-h-52">
                            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                              No members found.
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value={NONE_SENTINEL}
                                onSelect={() => handleManagerChange(NONE_SENTINEL)}
                              >
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="text-xs">No manager</span>
                                {!field.value && <Check className="ml-auto h-3 w-3" />}
                              </CommandItem>
                              {filteredManagers.map((m) => (
                                <CommandItem
                                  key={m.userId}
                                  value={m.userId}
                                  onSelect={() => handleManagerChange(m.userId)}
                                >
                                  <Avatar className="mr-2 h-5 w-5 shrink-0">
                                    <AvatarImage src={resolveImageUrl(m.image)} />
                                    <AvatarFallback className="text-[7px]">
                                      {getUserInitials({ name: m.name, email: m.email })}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <span className="truncate text-xs block">
                                      {getUserDisplayName({ name: m.name, email: m.email })}
                                    </span>
                                    {m.name && (
                                      <span className="truncate text-[10px] text-muted-foreground block">
                                        {m.email}
                                      </span>
                                    )}
                                  </div>
                                  {m.userId === field.value && <Check className="ml-auto h-3 w-3 shrink-0" />}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Client{" "}
                  <span className="text-muted-foreground font-normal">(Optional)</span>
                </FormLabel>
                <Select
                  value={field.value || NONE_SENTINEL}
                  onValueChange={handleClientChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>No client</SelectItem>
                    {clientList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Start date"
                      dateFormat="dd/MM/yyyy"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="End date"
                      dateFormat="dd/MM/yyyy"
                      fromDate={
                        watchedStartDate
                          ? new Date(watchedStartDate)
                          : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    );
  }
);
