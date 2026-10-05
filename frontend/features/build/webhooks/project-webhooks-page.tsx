"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { WebhookFormSheet } from "@/features/build/webhooks/webhook-form-sheet";
import { WebhookFilterToolbar } from "@/features/build/webhooks/webhook-filter-toolbar";
import { WebhookConflictDialog } from "@/features/build/webhooks/webhook-conflict-dialog";
import { useWebhookListCommands } from "@/features/build/webhooks/use-webhook-list-commands";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useWebhooks,
  useCreateWebhook,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import {
  webhookSchema,
  type WebhookFormValues,
} from "@/features/build/webhooks/webhook-schema";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { AddWebhookButton } from "./add-webhook-button";
import { useWebhookPageUrlState } from "./use-webhook-page-url-state";
import { WebhookEmptyState } from "./webhook-empty-state";
import { WebhookListContent } from "./webhook-list-content";

interface ProjectWebhooksPageProps {
  projectId: string;
}

export function ProjectWebhooksPage({ projectId: projectIdStr }: ProjectWebhooksPageProps) {
  const projectId = parseInt(projectIdStr);
  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ProjectWebhook | null>(null);
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    stateParam, eventParam, qParam, fromParam, toParam,
    qInput, handleStateChange, handleEventChange,
    handleFromChange, handleToChange, handleQChange,
  } = useWebhookPageUrlState();

  const filterKey = `${stateParam ?? ""}|${eventParam ?? ""}|${qParam ?? ""}|${fromParam ?? ""}|${toParam ?? ""}`;
  const pager = useBuildCursorPager(filterKey);
  const cursorParam = pager.cursor ? Number(pager.cursor) : undefined;

  const filters =
    stateParam || eventParam || qParam || cursorParam !== undefined || fromParam || toParam
      ? { state: stateParam ?? undefined, event: eventParam, q: qParam, cursor: cursorParam, from: fromParam, to: toParam }
      : undefined;

  const { data: webhookPage, isLoading, isError, error, refetch } = useWebhooks(projectId, filters);

  const pageState = usePageState({
    permission: "build:manage",
    isLoading,
    isError,
    error,
    isEmpty: webhookPage?.data !== undefined && webhookPage.data.length === 0,
  });

  const createWebhook = useCreateWebhook(projectId);
  const webhookList = useMemo(() => webhookPage?.data ?? [], [webhookPage]);
  const commands = useWebhookListCommands({
    projectId,
    webhookList,
    refetch,
    resetKey: `${filterKey}|${pager.cursor ?? ""}`,
  });

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [], secret: "" },
  });
  useRegisterDirtyState(sheetOpen && form.formState.isDirty);

  const handleSubmit = useCallback(
    (values: WebhookFormValues) => {
      if (editingWebhook) {
        commands.updateWebhook.mutate(
          { webhookId: editingWebhook.id, version: editingWebhook.version, url: values.url, events: values.events },
          {
            onSuccess: () => { form.reset(); setSheetOpen(false); setEditingWebhook(null); toast.success("Webhook updated"); },
            onError: (e) => commands.handleMutationError(e, editingWebhook.id, { url: values.url, events: values.events }),
          },
        );
      } else {
        createWebhook.mutate(
          { url: values.url, events: values.events, secret: values.secret || undefined },
          {
            onSuccess: () => { form.reset(); setSheetOpen(false); toast.success("Webhook created"); },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [createWebhook, commands, editingWebhook, form],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleEdit = useCallback(
    (webhook: ProjectWebhook) => {
      setEditingWebhook(webhook);
      form.reset({ url: webhook.url, events: webhook.events, secret: "" });
      setSheetOpen(true);
    },
    [form],
  );
  const handleCancelForm = useCallback(() => { setSheetOpen(false); setEditingWebhook(null); form.reset(); }, [form]);
  const handleShowForm = useCallback(() => setSheetOpen(true), []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const handleNextPage = useCallback(() => {
    pager.goNext(webhookPage?.nextCursor === null || webhookPage?.nextCursor === undefined ? undefined : String(webhookPage.nextCursor));
  }, [pager, webhookPage?.nextCursor]);

  const handleExpandedChange = useCallback((webhookId: number, next: boolean) => {
    setExpandedId(next ? webhookId : null);
  }, []);

  const handleOpenWebhook = useCallback((index: number) => {
    const focused = webhookList[index];
    if (!focused) return;
    setExpandedId((prev) => (prev === focused.id ? null : focused.id));
  }, [webhookList]);

  const handleDensityToggle = useCallback(() => {
    setDensity((prev) => (prev === "compact" ? "comfortable" : "compact"));
  }, []);

  const handleEditFocused = useCallback((index: number) => {
    const focused = webhookList[index];
    if (focused) handleEdit(focused);
  }, [webhookList, handleEdit]);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: webhookList.length,
    onOpen: handleOpenWebhook,
    onEdit: canManage && isOnline ? handleEditFocused : undefined,
    onCreate: canManage && isOnline ? handleShowForm : undefined,
    onClearSelection: commands.clearSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: pageState.kind === "ready",
  });

  const hasActiveFilters = !!(stateParam || eventParam || qParam || fromParam || toParam);

  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Receive HTTP POST notifications when project events occur"
      actions={canManage && isOnline ? <AddWebhookButton onClick={handleShowForm} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <WebhookFilterToolbar
            searchInputRef={searchInputRef}
            search={qInput}
            state={stateParam}
            event={eventParam}
            from={fromParam}
            to={toParam}
            density={density}
            onSearchChange={handleQChange}
            onStateChange={handleStateChange}
            onEventChange={handleEventChange}
            onFromChange={handleFromChange}
            onToChange={handleToChange}
            onDensityToggle={handleDensityToggle}
          />
          <PageState
            resolution={pageState}
            loading={
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            }
            empty={
              <WebhookEmptyState
                isOnline={isOnline}
                hasActiveFilters={hasActiveFilters}
                onCreateWebhook={canManage ? handleShowForm : undefined}
              />
            }
            onRetry={handleRetry}
            className="flex-1"
          >
            <WebhookListContent
              projectId={projectId}
              webhookList={webhookList}
              canManage={canManage}
              isOnline={isOnline}
              density={density}
              expandedId={expandedId}
              focusedIndex={focusedIndex}
              onExpandedChange={handleExpandedChange}
              onNextPage={handleNextPage}
              pageNumber={pager.pageNumber}
              hasMore={webhookPage?.hasMore ?? false}
              hasPrevious={pager.hasPrevious}
              onPrevious={pager.goPrevious}
              selectedIds={commands.selectedIds}
              selectedWebhooks={commands.selectedWebhooks}
              bulkPending={commands.bulkPending}
              onBulkEnable={commands.handleBulkEnable}
              onBulkDisable={commands.handleBulkDisable}
              onBulkDelete={commands.handleBulkDelete}
              onClearSelection={commands.clearSelection}
              onDelete={commands.handleDelete}
              onToggle={commands.handleToggle}
              onSelectedChange={commands.handleSelectedChange}
              onEdit={handleEdit}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      <WebhookConflictDialog
        open={commands.conflictOpen}
        fields={commands.conflictFields}
        isReapplying={commands.updateWebhook.isPending}
        onKeepMine={commands.handleConflictKeepMine}
        onDiscard={commands.handleConflictDiscard}
      />
      <WebhookFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isEditing={editingWebhook !== null}
        isPending={editingWebhook ? commands.updateWebhook.isPending : createWebhook.isPending}
        form={form}
        onSubmit={handleSubmit}
        onCancel={handleCancelForm}
      />
    </PageWrapper>
  );
}
