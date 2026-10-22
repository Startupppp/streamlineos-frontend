"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDeleteWebForm, useUpdateWebForm, useWebForms } from "@/hooks/api/crm/web-forms";
import type { WebForm } from "@/hooks/api/crm/web-forms-schema";
import { useFeature } from "@/lib/billing/use-feature";
import { writeToClipboard } from "@/lib/clipboard";
import { getErrorMessage } from "@/lib/get-error-message";
import { WebFormSheet } from "./web-form-sheet";

const HEADERS = ["Form", "Fields", "Submissions", "Accepting", ""];

function leadFormUrl(origin: string, publicToken: string): string {
  return `${origin}/lead-form/${encodeURIComponent(publicToken)}`;
}

export function WebFormsPage() {
  const feature = useFeature("crm.web-forms");
  const forms = useWebForms();
  const canManage = useCan("crm:web-forms:manage");
  const update = useUpdateWebForm();
  const remove = useDeleteWebForm();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebForm | null>(null);

  const rows = useMemo(() => forms.data ?? [], [forms.data]);
  const pageState = usePageState({
    permission: "crm:web-forms:manage",
    isLoading: forms.isLoading,
    isError: forms.isError,
    error: forms.error,
    isEmpty: forms.data !== undefined && rows.length === 0,
  });

  const findForm = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) =>
      rows.find((form) => String(form.id) === event.currentTarget.dataset.formId),
    [rows],
  );
  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);
  const handleEdit = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const form = findForm(event);
      if (!form) return;
      setEditTarget(form);
      setSheetOpen(true);
    },
    [findForm],
  );
  const handleAskDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => setDeleteTarget(findForm(event) ?? null),
    [findForm],
  );
  const handleCopy = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      const form = findForm(event);
      if (!form) return;
      const url = leadFormUrl(window.location.origin, form.publicToken);
      if (await writeToClipboard(url)) toast.success("Link copied");
      else toast.error(`Couldn't copy. The link is ${url}`);
    },
    [findForm],
  );
  const handleToggle = useCallback(
    (form: WebForm) =>
      update.mutate(
        { id: form.id, isActive: !form.isActive },
        {
          onSuccess: (saved) => toast.success(saved.isActive ? "Form reopened" : "Form paused"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      ),
    [update],
  );
  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Form deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteTarget, remove]);
  const handleRetry = useCallback(() => void forms.refetch(), [forms]);

  if (!feature.enabled)
    return (
      <PageWrapper title="Web forms">
        <EmptyState
          title="Web forms are not on your plan"
          description={feature.upgradeMessage}
          action={{ label: "See plans", href: "/settings/billing" }}
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Web forms"
      subtitle="Public forms whose every submission becomes a lead."
      state={pageState}
      onRetry={handleRetry}
      loading={<DataTableSkeleton rows={6} headers={HEADERS} className="flex-1" />}
      empty={
        <EmptyState
          title="No web forms yet"
          description="Create a form, share its link or embed it, and each submission arrives as a lead."
          action={canManage ? { label: "New form", onClick: handleCreate } : undefined}
          className={CONTENT_FILL_PANEL}
        />
      }
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleCreate}>
            New form
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {HEADERS.map((header) => (
                <TableHead key={header || "actions"}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((form) => (
              <WebFormRow
                key={form.id}
                form={form}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onCopy={handleCopy}
                onDelete={handleAskDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <WebFormSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} webForm={editTarget} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this form?"
        description={
          deleteTarget
            ? `${deleteTarget.name} stops accepting submissions and its link stops working. Leads it already created are kept.`
            : ""
        }
        confirmLabel="Delete form"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}

interface WebFormRowProps {
  form: WebForm;
  onToggle: (form: WebForm) => void;
  onEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCopy: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function WebFormRow({ form, onToggle, onEdit, onCopy, onDelete }: WebFormRowProps) {
  const handleToggle = useCallback(() => onToggle(form), [form, onToggle]);
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{form.name}</span>
          {form.description ? <span className="text-sm text-muted-foreground">{form.description}</span> : null}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">{form.fields.length}</TableCell>
      <TableCell className="tabular-nums">{form.totalSubmissions}</TableCell>
      <TableCell>
        <Switch
          checked={form.isActive}
          onCheckedChange={handleToggle}
          aria-label={form.isActive ? `Pause ${form.name}` : `Reopen ${form.name}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" data-form-id={form.id} onClick={onCopy}>
            Copy link
          </Button>
          <Button variant="outline" size="sm" data-form-id={form.id} onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" data-form-id={form.id} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
