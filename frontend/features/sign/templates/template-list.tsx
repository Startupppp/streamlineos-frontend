"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Send, Copy, Archive, CheckCircle2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDuplicateSignTemplate, useSignTemplates, useUpdateSignTemplate } from "@/hooks/api/sign/templates";
import type { SignTemplate, SignTemplateStatus } from "@/types/sign";
import { CreateEnvelopeFromTemplateDialog } from "./create-envelope-from-template-dialog";

const STATUS_VARIANT: Record<SignTemplateStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

function TemplateRow({ template }: { template: SignTemplate }) {
  const [createOpen, setCreateOpen] = useState(false);
  const duplicate = useDuplicateSignTemplate();
  const update = useUpdateSignTemplate(template.id);

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

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{template.name}</p>
          <Badge variant={STATUS_VARIANT[template.status]}>{template.status}</Badge>
        </div>
        {template.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">v{template.version}{template.category ? ` · ${template.category}` : ""}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {template.status === "published" && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Send className="size-4" />
            New envelope
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            {template.status !== "published" && (
              <DropdownMenuItem onClick={() => handleStatusChange("published")}>
                <CheckCircle2 className="size-4" />
                Publish
              </DropdownMenuItem>
            )}
            {template.status !== "archived" && (
              <DropdownMenuItem onClick={() => handleStatusChange("archived")} variant="destructive">
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CreateEnvelopeFromTemplateDialog template={template} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export function TemplateList() {
  const { data: templates, isLoading, isError, refetch } = useSignTemplates();

  return (
    <PageWrapper title="Templates" subtitle="Reusable envelope layouts you can send again and again">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load templates" onRetry={() => void refetch()} />
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-1 h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <IllustrationImage name="empty-documents" className="h-40 w-40" />
          <div>
            <p className="font-medium text-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Open any envelope and choose &quot;Save as template&quot; to reuse its layout later.
            </p>
          </div>
        </div>
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
