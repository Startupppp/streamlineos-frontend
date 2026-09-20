"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2 } from "lucide-react";
import { EllipsisIcon, SendIcon, CopyIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDuplicateSignTemplate, useSignTemplates, useUpdateSignTemplate } from "@/hooks/api/sign/templates";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { SignTemplate, SignTemplateStatus } from "@/types/sign";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CreateEnvelopeFromTemplateDialog } from "./create-envelope-from-template-dialog";
import { useCan } from "@/hooks/api/access";

const STATUS_VARIANT: Record<SignTemplateStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

function TemplateRow({ template }: { template: SignTemplate }) {
  const canManageTemplates = useCan("sign:template:manage");
  const canCreateEnvelope = useCan("sign:envelope:create");
  const [createOpen, setCreateOpen] = useState(false);
  const duplicate = useDuplicateSignTemplate();
  const update = useUpdateSignTemplate(template.id);
  const { iconRef: sendRef, hoverHandlers: sendHover } = useAnimatedIcon();
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } = useAnimatedIcon();

  async function handleDuplicate() {
    try {
      await duplicate.mutateAsync(template.id);
      toast.success("Template duplicated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleStatusChange(status: SignTemplateStatus) {
    try {
      await update.mutateAsync({ status });
      toast.success(status === "published" ? "Template published" : "Template archived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  function handlePublish() {
    void handleStatusChange("published");
  }

  function handleArchive() {
    void handleStatusChange("archived");
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TruncatedText text={template.name} className="font-medium text-sm" />
          <Badge variant={STATUS_VARIANT[template.status]}>{template.status}</Badge>
        </div>
        {template.description && <TruncatedText text={template.description} className="text-xs text-muted-foreground mt-0.5" />}
        <p className="text-xs text-muted-foreground mt-0.5">v{template.version}{template.category ? ` · ${template.category}` : ""}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canCreateEnvelope && template.status === "published" && (
          <Button size="sm" onClick={handleCreateOpen} {...sendHover}>
            <SendIcon ref={sendRef} className="size-4" />
            New envelope
          </Button>
        )}
        {canManageTemplates && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Template actions" {...ellipsisHover}>
              <EllipsisIcon ref={ellipsisRef} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <CopyIcon className="size-4" />
              Duplicate
            </DropdownMenuItem>
            {template.status !== "published" && (
              <DropdownMenuItem onClick={handlePublish}>
                <CheckCircle2 className="size-4" />
                Publish
              </DropdownMenuItem>
            )}
            {template.status !== "archived" && (
              <DropdownMenuItem onClick={handleArchive} variant="destructive">
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
      {canCreateEnvelope && (
        <CreateEnvelopeFromTemplateDialog template={template} open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  );
}

export function TemplateList() {
  const { data: templates, isLoading, isFetching, isError, error, refetch, access } = useSignTemplates();
  
  /** SIGN-003: Show error if query is stuck pending due to permission denial */
  const showError = isError || (access && !access.allowed && !isFetching);
  const effectiveError = !access?.allowed && !isFetching
    ? new Error("You don't have permission to view templates")
    : error;

  async function handleRetry() {
    await refetch();
  }

  return (
    <PageWrapper title="Templates" subtitle="Reusable envelope layouts you can send again and again">
      {isLoading || isFetching ? (
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : showError ? (
        <ErrorState 
          className="flex-1"
          title="Failed to load templates" 
          description={getErrorMessage(effectiveError)}
          onRetry={handleRetry} 
        />
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          illustrationPreset="documents"
          title="No templates yet"
          description='Open any envelope and choose "Save as template" to reuse its layout later.'
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
