"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  FilePlus2,
  Pencil,
  FileCheck,
  FileLock,
  FileKey,
  Smile,
  AlertCircle,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";

import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  useSetDocumentTemplateDefault,
  type DocumentTemplate,
} from "@/hooks/api/hr/document-templates";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  VariableChips,
  PreviewDialog,
  DeleteConfirm,
  DefaultStarButton,
} from "@/features/hr/documents/template-table-cells";

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  OFFER_LETTER: {
    label: "Offer Letter",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-700",
    icon: FileCheck,
  },
  NDA: {
    label: "NDA",
    badgeClass:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-700",
    icon: FileLock,
  },
  POLICY: {
    label: "Policy",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-700",
    icon: FileKey,
  },
  WELCOME: {
    label: "Welcome",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-700",
    icon: Smile,
  },
  OTHER: {
    label: "Other",
    badgeClass:
      "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.OTHER;
}

function TemplatesPageSkeleton() {
  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
      actions={<Skeleton className="h-8 w-[140px] rounded-md" />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-10" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 border-b">
            {["Title", "Type", "Variables", "Version", "Status", "Created"].map(
              (h) => (
                <Skeleton
                  key={h}
                  className="h-3"
                  style={{ width: `${h.length * 9}px` }}
                />
              ),
            )}
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-7 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

function buildTemplateColumns(
  currentDefault: DocumentTemplate | undefined,
  onDelete: (id: number) => void,
  onSetDefault: (id: number, isDefault: boolean) => void,
  isDeletePending: boolean,
  isSetDefaultPending: boolean,
  router: ReturnType<typeof useRouter>,
): DataTableColumn<DocumentTemplate>[] {
  return [
    {
      key: "star",
      header: "",
      headerClassName: "w-[32px]",
      className: "w-[32px]",
      cell: (template) => (
        <DefaultStarButton
          template={template}
          currentDefault={currentDefault}
          onSetDefault={onSetDefault}
          isPending={isSetDefaultPending}
        />
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      headerClassName: "w-[220px]",
      cell: (template) => {
        const cfg = getTypeConfig(template.type);
        const TypeIcon = cfg.icon;
        return (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <TruncatedText text={template.title} className="font-medium text-sm" />
            {template.isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-700 shrink-0">
                Default
              </span>
            )}
          </div>
        );
      },
      sortable: true,
      sortValue: (t) => t.title,
    },
    {
      key: "type",
      header: "Type",
      headerClassName: "w-[120px]",
      cell: (template) => {
        const cfg = getTypeConfig(template.type);
        return (
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.badgeClass)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "variables",
      header: "Variables",
      cell: (template) => <VariableChips variables={template.variables ?? []} />,
    },
    {
      key: "version",
      header: "Version",
      headerClassName: "w-[90px] text-center",
      className: "text-center",
      cell: (template) => (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
          v{template.version}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[90px]",
      cell: (template) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            template.isActive
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-700"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          {template.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[120px]",
      className: "text-xs text-muted-foreground",
      cell: (template) =>
        template.createdAt ? format(new Date(template.createdAt), "MMM d, yyyy") : "—",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[56px]",
      cell: (template) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="w-7 hover:bg-muted transition-colors duration-200"
              aria-label="Template actions"
              onClick={(e) => e.stopPropagation()}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/hr/documents/templates/${template.id}/edit`)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <PreviewDialog template={template} />
            <DropdownMenuSeparator />
            <DeleteConfirm
              template={template}
              onDelete={onDelete}
              isPending={isDeletePending}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export default function DocumentTemplatesPage() {
  const router = useRouter();
  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useDocumentTemplates();
  const deleteMutation = useDeleteDocumentTemplate();
  const setDefaultMutation = useSetDocumentTemplateDefault();

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Template deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteMutation],
  );

  const handleSetDefault = useCallback(
    (id: number, isDefault: boolean) => {
      setDefaultMutation.mutate(
        { id, isDefault },
        {
          onSuccess: () =>
            toast.success(
              isDefault ? "Template set as default" : "Default status removed",
            ),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [setDefaultMutation],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <TemplatesPageSkeleton />;

  if (isError) {
    return (
      <PageWrapper
        title="Document Templates"
        subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
 variant="display">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Failed to load document templates
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Something went wrong. Please try again.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const list = templates ?? [];
  const total = list.length;
  const active = list.filter((t) => t.isActive).length;
  const ndaCount = list.filter((t) => t.type === "NDA").length;
  const offerCount = list.filter((t) => t.type === "OFFER_LETTER").length;
  const currentDefault = list.find((t) => t.isDefault);
  const columns = buildTemplateColumns(
    currentDefault,
    handleDelete,
    handleSetDefault,
    deleteMutation.isPending,
    setDefaultMutation.isPending,
    router,
  );

  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
      actions={
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/hr/documents/templates/new">
            <FilePlus2 className="h-3.5 w-3.5" />
            Add Template
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <StatCardGrid cols={4}>
          <StatCard label="Total Templates" value={total} icon={FileText} tone="blue" />
          <StatCard label="Active" value={active} icon={FileCheck} tone="emerald" />
          <StatCard label="NDAs" value={ndaCount} icon={FileLock} tone="red" />
          <StatCard label="Offer Letters" value={offerCount} icon={FileKey} tone="amber" />
        </StatCardGrid>

        <DataTable<DocumentTemplate>
          data={list}
          columns={columns}
          getRowKey={(t) => t.id}
          minWidth="780px"
          emptyState={
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
              title="No templates yet"
              description="Create your first document template to automate offer letters, NDAs, and more."
              action={{
                label: "Create your first template",
                href: "/hr/documents/templates/new",
              }}
            />
          }
        />
      </div>
    </PageWrapper>
  );
}
