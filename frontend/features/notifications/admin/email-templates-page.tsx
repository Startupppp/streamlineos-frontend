"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AppSheet } from "@/components/shared/app-sheet";
import { PageState } from "@/components/shared/page-state";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { usePageState } from "@/hooks/api/use-page-state";
import { useEmailTemplatePreviews } from "@/hooks/api/notifications-templates";
import type { EmailTemplatePreview } from "@/hooks/api/notifications-schema";
import { EMAIL_TEMPLATE_PREVIEW_LAYOUT } from "@/lib/renderer/notifications/email-template-preview-layout";
import { EmailTemplateTestDialog } from "./email-template-test-dialog";

const HEADERS = ["Email", "Category", "Subject", "Version", ""];

const CELLS = {
  version: (row: EmailTemplatePreview) => <span className="font-mono tabular-nums">v{row.version}</span>,
};

function rowKey(row: EmailTemplatePreview): string {
  return row.id;
}

interface RowActionsProps {
  row: EmailTemplatePreview;
  onPreview: (row: EmailTemplatePreview) => void;
  onTest: (row: EmailTemplatePreview) => void;
}

function RowActions({ row, onPreview, onTest }: RowActionsProps) {
  function handlePreview() {
    onPreview(row);
  }
  function handleTest() {
    onTest(row);
  }
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={handlePreview}>
        Preview
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={handleTest}>
        Send test
      </Button>
    </div>
  );
}

/** The platform's built-in transactional emails: preview each and send yourself a test. */
export function EmailTemplatesPage() {
  const layout = useTenantLayout(EMAIL_TEMPLATE_PREVIEW_LAYOUT);
  const { data: session } = useSession();
  const query = useEmailTemplatePreviews();
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const [previewing, setPreviewing] = useState<EmailTemplatePreview | null>(null);
  const [testing, setTesting] = useState<EmailTemplatePreview | null>(null);

  const pageState = usePageState({
    permission: "settings:email-templates:manage",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && rows.length === 0,
  });

  const renderActions = useCallback(
    (row: EmailTemplatePreview) => <RowActions row={row} onPreview={setPreviewing} onTest={setTesting} />,
    [],
  );

  function handlePreviewChange(open: boolean) {
    if (!open) setPreviewing(null);
  }

  function handleTestClose() {
    setTesting(null);
  }

  function handleRetry() {
    void query.refetch();
  }

  const emptyState = <EmptyState illustrationPreset="mail" title="No email templates" description="The platform ships none for this organisation yet." />;

  return (
    <PageWrapper
      title="Email templates"
      subtitle="Preview the emails this workspace sends and send yourself a test."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton headers={HEADERS} rows={8} className="min-h-0 flex-1" />}
        empty={emptyState}
        onRetry={handleRetry}
        className="flex-1"
      >
        <RecordList layout={layout} rows={rows} getRowKey={rowKey} cells={CELLS} actions={renderActions} emptyState={emptyState} minWidth="720px" className="flex-1 min-h-0" pagination={{ pageSize: 20 }} />
      </PageState>

      <AppSheet
        open={previewing !== null}
        onOpenChange={handlePreviewChange}
        title={previewing?.name ?? "Preview"}
        description={previewing ? `Subject: ${previewing.subject}` : undefined}
        className="sm:max-w-2xl"
      >
        {previewing ? (
          // Server-rendered email HTML. No scripts run: never `allow-scripts` with `allow-same-origin`.
          <iframe srcDoc={previewing.html} sandbox="" title={`${previewing.name} preview`} className="min-h-[60vh] w-full flex-1 rounded-md border border-border bg-background" />
        ) : null}
      </AppSheet>

      {testing ? <EmailTemplateTestDialog template={testing} defaultEmail={session?.user?.email ?? ""} onClose={handleTestClose} /> : null}
    </PageWrapper>
  );
}
