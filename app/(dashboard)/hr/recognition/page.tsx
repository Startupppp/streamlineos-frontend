"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRecognitions, useCreateRecognition, type Recognition } from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { formatDistanceToNow, startOfMonth } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { Heart, Plus, Award, Users, Lightbulb, Zap, Check, ChevronsUpDown, Trophy, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";
import { EmptyTeamIllustration } from "@/components/illustrations";

const CATEGORIES = [
  { value: "KUDOS", label: "Kudos", icon: Heart, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
  { value: "TEAMWORK", label: "Teamwork", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "INNOVATION", label: "Innovation", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { value: "LEADERSHIP", label: "Leadership", icon: Award, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { value: "ABOVE_AND_BEYOND", label: "Above & Beyond", icon: Zap, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
];

function getCategoryMeta(category: string | null) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

export default function RecognitionPage() {
  const { data: session } = useSession();
  const { data: recognitions, isLoading } = useRecognitions();
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
    [employeesRaw]
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
      if (existing) {
        existing.count++;
      } else {
        counts.set(r.toUserId, { name: r.toUser?.name ?? null, image: r.toUser?.image ?? null, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [list]);

  const filteredList = useMemo(
    () => (activeCategory ? list.filter((r) => r.category === activeCategory) : list),
    [list, activeCategory]
  );

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
      (Date.now() - new Date(r.createdAt).getTime()) < ONE_DAY
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
          setToUserId("");
          setMessage("");
          setCategory("KUDOS");
          setEmployeePickerOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [toUserId, message, category, createRecognition, list, session]);

  if (isLoading) {
    return (
      <PageWrapper title="Recognition" subtitle="Celebrate your team">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
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
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Give Kudos
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">{stats.thisMonth}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Award className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">My Given</p>
                <p className="text-xl font-bold">{stats.myGiven}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  !activeCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                All
              </button>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.value}
                    onClick={() => setActiveCategory(activeCategory === c.value ? null : c.value)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1",
                      activeCategory === c.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {!filteredList.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <EmptyTeamIllustration className="mx-auto mb-4 h-32 w-32 opacity-95" />
                  <p className="text-sm text-muted-foreground">
                    {activeCategory ? "No recognitions for this category yet." : "No recognition yet. Be the first to celebrate a teammate!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredList.map((r: Recognition) => {
                  const catMeta = getCategoryMeta(r.category);
                  const Icon = catMeta.icon;
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={resolveImageUrl(r.fromUser?.image ?? null)} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{r.fromUser?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold">{r.fromUser?.name}</span>
                              <span className="text-xs text-muted-foreground">recognized</span>
                              <span className="text-sm font-semibold">{r.toUser?.name}</span>
                              <Badge variant="outline" className={`text-[10px] gap-1 ${catMeta.color}`}>
                                <Icon className="h-3 w-3" />
                                {catMeta.label}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1.5 text-foreground/90">{r.message}</p>
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
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Top Recognized
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {topRecognized.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {topRecognized.map(([userId, data], index) => (
                      <div key={userId} className="flex items-center gap-2.5">
                        <span className={cn(
                          "text-xs font-bold w-5 text-center shrink-0",
                          index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={resolveImageUrl(data.image ?? null)} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{data.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium flex-1 truncate">{data.name ?? "Unknown"}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{data.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {stats.categoryBreakdown.map((c) => {
                  const Icon = c.icon;
                  const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0;
                  return (
                    <div key={c.value} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("flex items-center gap-1.5 text-xs", c.color)}>
                          <Icon className="h-3 w-3" />
                          {c.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", c.bg)}
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
        onOpenChange={(open) => {
          if (!open) { setToUserId(""); setMessage(""); setCategory("KUDOS"); }
          setSheetOpen(open);
        }}
        title="Give Recognition"
        onSubmit={handleSend}
        submitLabel="Send Kudos"
        isPending={createRecognition.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Who deserves recognition? <span className="text-destructive">*</span></label>
          <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={employeePickerOpen} className="w-full justify-between font-normal">
                {toUserId ? (employees.find((e) => e.id === toUserId)?.name ?? employees.find((e) => e.id === toUserId)?.email ?? "Select teammate") : "Select teammate"}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {employees.filter((e) => !!e.id && e.id !== session?.user?.id).map((e) => (
                      <CommandItem key={e.id} value={e.name ?? e.email ?? e.id} onSelect={() => { setToUserId(e.id); setEmployeePickerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", toUserId === e.id ? "opacity-100" : "opacity-0")} />
                        {e.name ?? e.email}
                      </CommandItem>
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
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
          <Textarea
            placeholder="What did they do that was awesome?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
