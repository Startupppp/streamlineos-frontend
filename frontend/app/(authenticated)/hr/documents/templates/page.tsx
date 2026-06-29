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
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  useSetDocumentTemplateDefault,
  type DocumentTemplate,
} from "@/hooks/api/hr/document-templates";
import { getErrorMessage } from "@/lib/get-error-message";
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
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    icon: FileCheck,
  },
  NDA: {
    label: "NDA",
    badgeClass:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
    icon: FileLock,
  },
  POLICY: {
    label: "Policy",
    badgeClass:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700",
    icon: FileKey,
  },
  WELCOME: {
    label: "Welcome",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
    icon: Smile,
  },
  OTHER: {
    label: "Other",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700",
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
                  <Skeleton className="h-7 w-10" />
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
          {Array.from({ length: 5 }).map((_, i) => (
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

interface TemplateTableRowProps {
  template: DocumentTemplate;
  currentDefault: DocumentTemplate | undefined;
  onDelete: (id: number) => void;
  onSetDefault: (id: number, isDefault: boolean) => void;
  isDeletePending: boolean;
  isSetDefaultPending: boolean;
}

function TemplateTableRow({
  template,
  currentDefault,
  onDelete,
  onSetDefault,
  isDeletePending,
  isSetDefaultPending,
}: TemplateTableRowProps) {
  const router = useRouter();
  const cfg = getTypeConfig(template.type);
  const TypeIcon = cfg.icon;

  const handleEdit = useCallback(
    () => router.push(`/hr/documents/templates/${template.id}/edit`),
    [router, template.id],
  );

  return (
    <TableRow className="hover:bg-muted/30 transition-colors duration-200">
      <TableCell className="py-3">
        <DefaultStarButton
          template={template}
          currentDefault={currentDefault}
          onSetDefault={onSetDefault}
          isPending={isSetDefaultPending}
        />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{template.title}</span>
          {template.isDefault && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 shrink-0">
              Default
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            cfg.badgeClass,
          )}
        >
          {cfg.label}
        </span>
      </TableCell>
      <TableCell className="py-3">
        <VariableChips variables={template.variables ?? []} />
      </TableCell>
      <TableCell className="py-3 text-center">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700">
          v{template.version}
        </span>
      </TableCell>
      <TableCell className="py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            template.isActive
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
              : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
          )}
        >
          {template.isActive ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell className="py-3 text-xs text-muted-foreground">
        {template.createdAt
          ? format(new Date(template.createdAt), "MMM d, yyyy")
          : "—"}
      </TableCell>
      <TableCell className="py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted transition-colors duration-200"
              aria-label="Template actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
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
      </TableCell>
    </TableRow>
  );
}

export default function DocumentTemplatesPage() {
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
      >
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
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

  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
      actions={
        <Button size="sm" className="gap-1.5 h-8" asChild>
          <Link href="/hr/documents/templates/new">
            <FilePlus2 className="h-3.5 w-3.5" />
            Add Template
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Templates"
            value={total}
            icon={FileText}
            color="blue"
            index={0}
          />
          <StatCard
            label="Active"
            value={active}
            icon={FileCheck}
            color="green"
            index={1}
          />
          <StatCard
            label="NDAs"
            value={ndaCount}
            icon={FileLock}
            color="red"
            index={2}
          />
          <StatCard
            label="Offer Letters"
            value={offerCount}
            icon={FileKey}
            color="amber"
            index={3}
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
            title="No templates yet"
            description="Create your first document template to automate offer letters, NDAs, and more."
            action={{
              label: "Create your first template",
              href: "/hr/documents/templates/new",
            }}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[780px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[32px]" />
                      <TableHead className="w-[220px] font-semibold text-foreground/80">
                        Title
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground/80">
                        Type
                      </TableHead>
                      <TableHead className="font-semibold text-foreground/80">
                        Variables
                      </TableHead>
                      <TableHead className="w-[90px] text-center font-semibold text-foreground/80">
                        Version
                      </TableHead>
                      <TableHead className="w-[90px] font-semibold text-foreground/80">
                        Status
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground/80">
                        Created
                      </TableHead>
                      <TableHead className="w-[56px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((template) => (
                      <TemplateTableRow
                        key={template.id}
                        template={template}
                        currentDefault={currentDefault}
                        onDelete={handleDelete}
                        onSetDefault={handleSetDefault}
                        isDeletePending={deleteMutation.isPending}
                        isSetDefaultPending={setDefaultMutation.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
