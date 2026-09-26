"use client";

import { useState, useCallback, useRef } from "react";
import { useModulePages, useCreateModule } from "@/hooks/api/build";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { LoadingButton } from "@/components/ui/loading-button";
import { ModuleCard, ModuleCardSkeleton } from "@/features/build/modules/module-card";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetBody } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { Calendar, Package, Activity, CheckCircle2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm, Controller } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EmojiIconPicker } from "@/components/ui/emoji-icon-picker";
import { formatModuleName } from "@/features/build/modules/lib/module-name";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import {
  createModuleSchema,
  type CreateModuleForm,
  FORM_DEFAULTS,
  MODULE_STATUSES,
  DESC_MAX,
} from "./create-module-schema";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";

function NewModuleButton() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      New Module
    </Button>
  );
}

interface ModulesPageProps {
  projectId: number;
}

export function ModulesPage({ projectId }: ModulesPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const canManage = useCan("build:workspace:manage");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters();

  const {
    data: modulePages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useModulePages(projectId);

  const pageState = usePageState({ isLoading, isError, error, permission: "build:view" });
  const allModules = modulePages?.pages.flatMap((page) => page.data) ?? [];
  const q = listFilters.debouncedSearch.toLowerCase();
  const statusFilter = listFilters.value("status");
  const leadFilter = listFilters.value("leadId");
  const modules = allModules.filter(
    (m) =>
      (!q || m.name.toLowerCase().includes(q)) &&
      (!statusFilter || statusFilter === "all" || m.status === statusFilter) &&
      (!leadFilter || leadFilter === "all" || m.leadId === leadFilter),
  );
  const createMutation = useCreateModule();

  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: FORM_DEFAULTS,
  });
  useRegisterDirtyState(createOpen && form.formState.isDirty);

  const descValue = form.watch("description") ?? "";
  const startDateValue = form.watch("startDate") ?? "";
  const endDateValue = form.watch("endDate") ?? "";
  const startPickerBounds = planningStartPickerProps();
  const endPickerBounds = planningEndPickerProps({
    startDate: startDateValue,
    mode: "after",
  });

  const handleSetStartDate = useCallback(
    (v: string) => {
      form.setValue("startDate", v, { shouldValidate: true });
      const currentEnd = form.getValues("endDate") ?? "";
      const nextEnd = clearEndIfInvalid(v, currentEnd, "after");
      if (nextEnd !== currentEnd)
        form.setValue("endDate", nextEnd, { shouldValidate: true });
    },
    [form],
  );

  const handleSetEndDate = useCallback(
    (v: string) => form.setValue("endDate", v, { shouldValidate: true }),
    [form],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset(FORM_DEFAULTS);
      setCreateOpen(open);
    },
    [form],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleLeadChange = useCallback(
    (userId: string | null) => form.setValue("leadId", userId ?? undefined),
    [form],
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      form.setValue("icon", icon ?? undefined, { shouldValidate: true });
    },
    [form],
  );

  const onSubmit = useCallback(
    (data: CreateModuleForm) => {
      const { icon, ...rest } = data;
      createMutation.mutate(
        {
          ...rest,
          name: formatModuleName(icon, data.name),
          projectId,
        },
        {
          onSuccess: () => {
            form.reset(FORM_DEFAULTS);
            setCreateOpen(false);
            toast.success("Module created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, form, projectId],
  );

  const handleClearModulesKeyboard = useCallback(() => {}, []);
  const handleOpenModuleByIndex = useCallback((_index: number) => {}, []);
  useBuildListKeyboard({
    itemCount: modules.length,
    onOpen: handleOpenModuleByIndex,
    onClearSelection: handleClearModulesKeyboard,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  const total = modules?.length ?? 0;
  const inProgress = modules?.filter((m) => m.status === "in-progress").length ?? 0;
  const completed = modules?.filter((m) => m.status === "completed").length ?? 0;
  const planned = modules?.filter((m) => m.status === "planned").length ?? 0;

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper
        title="Modules"
        subtitle="Organize work into feature groups and track module progress"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper
        title="Modules"
        subtitle="Organize work into feature groups and track module progress"
      >
        <PmPageShell>
          <PmSection index={0}>
            <StatCardGridSkeleton cols={4} count={4} />
          </PmSection>
          <PmSection index={1}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ModuleCardSkeleton key={i} />
              ))}
            </div>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Modules"
      subtitle="Organize work into feature groups and track module progress"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search modules",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        canManage ? <Sheet open={createOpen} onOpenChange={handleOpenChange}>
          <SheetTrigger asChild>
            <NewModuleButton />
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Module</SheetTitle>
            </SheetHeader>
            <SheetBody className="px-6 py-5">
              <form id="module-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mod-name">Name</Label>
                  <div className="flex gap-2">
                    <Controller
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <EmojiIconPicker
                          id="mod-icon"
                          icon={field.value}
                          onIconChange={handleIconChange}
                        />
                      )}
                    />
                    <Input id="mod-name" className="flex-1" {...form.register("name")} />
                  </div>
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mod-desc">Description</Label>
                    <span
                      className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {descValue.length}/{DESC_MAX}
                    </span>
                  </div>
                  <Textarea id="mod-desc" rows={3} {...form.register("description")} />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODULE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-start">Start Date</Label>
                    <DatePicker
                      id="mod-start"
                      value={startDateValue}
                      onChange={handleSetStartDate}
                      placeholder="Start date"
                      fromDate={startPickerBounds.fromDate}
                      fromYear={startPickerBounds.fromYear}
                      toYear={startPickerBounds.toYear}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-end">End Date</Label>
                    <DatePicker
                      id="mod-end"
                      value={endDateValue}
                      onChange={handleSetEndDate}
                      placeholder="End date"
                      fromDate={endPickerBounds.fromDate}
                      fromYear={endPickerBounds.fromYear}
                      toYear={endPickerBounds.toYear}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Lead</Label>
                  <Controller
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <ProjectMemberSelect
                        projectId={projectId}
                        mode="single"
                        value={field.value}
                        onChange={handleLeadChange}
                        allowUnassigned
                        placeholder="No lead"
                        className="h-9 text-sm"
                      />
                    )}
                  />
                </div>
              </form>
            </SheetBody>
            <div className="shrink-0 px-6 py-4 border-t">
              <LoadingButton
                type="submit"
                form="module-form"
                isPending={createMutation.isPending}
                loadingText="Creating…"
                className="w-full"
              >
                Create Module
              </LoadingButton>
            </div>
          </SheetContent>
        </Sheet> : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGrid cols={4}>
            <StatCard label="Total" value={total} icon={Package} tone="default" />
            <StatCard label="In Progress" value={inProgress} icon={Activity} tone="default" />
            <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Planned" value={planned} icon={Calendar} tone="amber" />
          </StatCardGrid>
        </PmSection>

        {!modules?.length ? (
          <PmSection index={1} className={PM_FILL_SECTION}>
            <EmptyState
              illustration={<EmptyTasksIllustration />}
              title="No modules yet"
              description="Create your first module to organize work into feature areas."
              action={canManage ? { label: "Create First Module", onClick: handleOpenCreate } : undefined}
              className={PM_FILL_PANEL}
            />
          </PmSection>
        ) : (
          <PmSection index={1}>
            <PmStaggerList className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod, index) => (
                <ModuleCard key={mod.id} module={mod} projectId={projectId} index={index} />
              ))}
            </PmStaggerList>
            <InfiniteScrollSentinel
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more modules"
            />
          </PmSection>
        )}
      </PmPageShell>
    </PageWrapper>
  );
}
