"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRecognitions, useCreateRecognition, type Recognition } from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "sonner";
import { formatDistanceToNow, startOfMonth } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Heart, Plus, Award, Users, Lightbulb, Zap, Check, ChevronsUpDown, Trophy, TrendingUp, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

const CATEGORIES = [
  { value: "KUDOS", label: "Kudos", icon: Heart, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30", accent: "border-l-pink-500" },
  { value: "TEAMWORK", label: "Teamwork", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", accent: "border-l-blue-500" },
  { value: "INNOVATION", label: "Innovation", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", accent: "border-l-amber-500" },
  { value: "LEADERSHIP", label: "Leadership", icon: Award, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", accent: "border-l-violet-500" },
  { value: "ABOVE_AND_BEYOND", label: "Above & Beyond", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", accent: "border-l-emerald-500" },
];

function getCategoryMeta(category: string | null) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

interface CategoryButtonProps {
  category: typeof CATEGORIES[number];
  isActive: boolean;
  onToggle: (value: string) => void;
}

function CategoryButton({ category, isActive, onToggle }: CategoryButtonProps) {
  const handleClick = useCallback(() => onToggle(category.value), [onToggle, category.value]);
  const Icon = category.icon;
  return (
    <button
      onClick={handleClick}
      className={cn(
        "text-xs px-3 py-1 rounded-full border transition-colors duration-200 flex items-center gap-1",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {category.label}
    </button>
  );
}

interface EmployeeCommandItemProps {
  employee: Employee;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function EmployeeCommandItem({ employee, isSelected, onSelect, onClose }: EmployeeCommandItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(employee.id);
    onClose();
  }, [onSelect, onClose, employee.id]);
  return (
    <CommandItem
      value={employee.name ?? employee.email ?? employee.id}
      onSelect={handleSelect}
    >
      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
      {employee.name ?? employee.email}
    </CommandItem>
  );
}

export default function RecognitionPage() {
  const { data: session } = useSession();
  const { data: recognitions, isLoading, isError, refetch } = useRecognitions();
  const { data: employeesRaw } = useHrEmployees();
  const createRecognition = useCreateRecognition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("KUDOS");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const list = useMemo(() => (recognitions ?? []) as Recognition[], [recognitions]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    return {
      total: list.length,
      thisMonth: list.filter((r) => r.createdAt && new Date(r.createdAt) >= monthStart).length,
      myGiven: list.filter((r) => r.fromUserId === session?.user?.id).length,
      categoryBreakdown: CATEGORIES.map((c) => ({
        ...c,
        count: list.filter((r) => r.category === c.value).length,
      })),
    };
  }, [list, session?.user?.id]);

  const topRecognized = useMemo(() => {
    const counts = new Map<string, { name: string | null; image: string | null; count: number }>();
    for (const r of list) {
      if (!r.toUserId) continue;
      const existing = counts.get(r.toUserId);
      if (existing) { existing.count++; }
      else { counts.set(r.toUserId, { name: r.toUser?.name ?? null, image: r.toUser?.image ?? null, count: 1 }); }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [list]);

  const filteredList = useMemo(
    () => (activeCategory ? list.filter((r) => r.category === activeCategory) : list),
    [list, activeCategory],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) { setToUserId(""); setMessage(""); setCategory("KUDOS"); }
    setSheetOpen(open);
  }, []);

  const handleSend = useCallback(() => {
    if (!toUserId) { toast.error("Please select a recipient"); return; }
    const trimmedMessage = message.trim();
    if (!trimmedMessage) { toast.error("Message is required"); return; }
    if (trimmedMessage.length < 10) { toast.error("Message must be at least 10 characters"); return; }
    if (trimmedMessage.length > 500) { toast.error("Message must be at most 500 characters"); return; }

    const currentUserId = session?.user?.id;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const recentDuplicate = currentUserId && list.some((r: Recognition) =>
      r.toUserId === toUserId &&
      r.fromUserId === currentUserId &&
      r.createdAt &&
      (Date.now() - new Date(r.createdAt).getTime()) < ONE_DAY,
    );
    if (recentDuplicate) {
      toast.error("You already recognized this employee in the last 24 hours");
      return;
    }

    createRecognition.mutate(
      { toUserId, message: trimmedMessage, category },
      {
        onSuccess: () => {
          toast.success("Recognition sent!");
          setSheetOpen(false);
          setToUserId(""); setMessage(""); setCategory("KUDOS"); setEmployeePickerOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [toUserId, message, category, createRecognition, list, session]);

  const handleToggleCategory = useCallback((val: string) => {
    setActiveCategory((prev) => (prev === val ? null : val));
  }, []);

  const handleClearCategory = useCallback(() => setActiveCategory(null), []);

  const handleSelectEmployee = useCallback((id: string) => setToUserId(id), []);
  const handleCloseEmployeePicker = useCallback(() => setEmployeePickerOpen(false), []);
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value), []);

  if (isError) {
    return (
      <PageWrapper title="Recognition" subtitle="Celebrate your team">
        <ErrorState message="Failed to load recognitions" onRetry={refetch} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Recognition" subtitle="Celebrate your team">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recognition"
      subtitle="Celebrate achievements and recognize great work"
      badge={`${stats.total} recognitions`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Give Kudos
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total" value={stats.total} icon={TrendingUp} color="blue" index={0} />
          <StatCard label="This Month" value={stats.thisMonth} icon={Heart} color="cyan" index={1} />
          <StatCard label="My Given" value={stats.myGiven} icon={Award} color="amber" index={2} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleClearCategory}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors duration-200",
                  !activeCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <CategoryButton
                  key={c.value}
                  category={c}
                  isActive={activeCategory === c.value}
                  onToggle={handleToggleCategory}
                />
              ))}
            </div>

            {!filteredList.length ? (
              <EmptyState
                illustration={<Trophy className="h-8 w-8 text-muted-foreground" />}
                title={activeCategory ? "No recognitions for this category" : "No recognition yet"}
                description={activeCategory ? undefined : "Be the first to celebrate a teammate!"}
                action={!activeCategory ? { label: "Give Kudos", onClick: handleOpenSheet } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {filteredList.map((r: Recognition) => {
                  const catMeta = getCategoryMeta(r.category);
                  const Icon = catMeta.icon;
                  return (
                    <Card
                      key={r.id}
                      className={cn(
                        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
                        "border-l-4 transition-shadow duration-200 hover:shadow-md",
                        catMeta.accent,
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                            catMeta.bg,
                          )}>
                            <Icon className={cn("h-3.5 w-3.5", catMeta.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={resolveImageUrl(r.fromUser?.image ?? null)} />
                                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                    {r.fromUser?.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-semibold">{r.fromUser?.name}</span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={resolveImageUrl(r.toUser?.image ?? null)} />
                                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                    {r.toUser?.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-semibold">{r.toUser?.name}</span>
                              </div>
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                "bg-muted/60 border-border text-muted-foreground",
                              )}>
                                <Icon className={cn("h-2.5 w-2.5", catMeta.color)} />
                                {catMeta.label}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed">{r.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Top Recognized</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {topRecognized.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {topRecognized.map(([topUserId, data], index) => (
                      <div key={topUserId} className="flex items-center gap-2.5">
                        <span className={cn(
                          "text-xs font-bold w-5 text-center shrink-0",
                          index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-muted-foreground",
                        )}>
                          {index + 1}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={resolveImageUrl(data.image ?? null)} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{data.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium flex-1 truncate">{data.name ?? "Unknown"}</span>
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {data.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-foreground">By Category</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {stats.categoryBreakdown.map((c) => {
                  const Icon = c.icon;
                  const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0;
                  return (
                    <div key={c.value} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", c.color)}>
                          <Icon className="h-3 w-3" />
                          {c.label}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{c.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", c.bg)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Give Recognition"
        onSubmit={handleSend}
        submitLabel="Send Kudos"
        isPending={createRecognition.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Who deserves recognition? <span className="text-destructive">*</span></label>
          <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={employeePickerOpen}
                className="w-full justify-between font-normal"
              >
                {toUserId
                  ? (employees.find((e) => e.id === toUserId)?.name ?? employees.find((e) => e.id === toUserId)?.email ?? "Select teammate")
                  : "Select teammate"}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {employees.filter((e) => !!e.id && e.id !== session?.user?.id).map((e) => (
                      <EmployeeCommandItem
                        key={e.id}
                        employee={e}
                        isSelected={toUserId === e.id}
                        onSelect={handleSelectEmployee}
                        onClose={handleCloseEmployeePicker}
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
          <Textarea
            placeholder="What did they do that was awesome?"
            value={message}
            onChange={handleMessageChange}
            rows={4}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
