"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  FilePlus2,
  Pencil,
  Trash2,
  Eye,
  FileCheck,
  FileLock,
  FileKey,
  Smile,
  MoreHorizontal,
  Star,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  useSetDocumentTemplateDefault,
  type DocumentTemplate,
} from "@/lib/api/hooks/hr/document-templates";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";


const TYPE_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OFFER_LETTER: {
    label: "Offer Letter",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: FileCheck,
  },
  NDA: {
    label: "NDA",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: FileLock,
  },
  POLICY: {
    label: "Policy",
    className: "bg-blue/10 text-blue border-blue/20",
    icon: FileKey,
  },
  WELCOME: {
    label: "Welcome",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Smile,
  },
  OTHER: {
    label: "Other",
    className: "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.OTHER;
}


function VariableChips({ variables }: { variables: string[] }) {
  const visible = variables.slice(0, 3);
  const rest = variables.length - 3;
  if (!variables.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60"
        >
          {`{{${v}}}`}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground border border-border/40">
          +{rest} more
        </span>
      )}
    </div>
  );
}


function PreviewDialog({ template }: { template: DocumentTemplate }) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((e: Event) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((val: boolean) => setOpen(val), []);

  return (
    <>
      <DropdownMenuItem onSelect={handleSelect}>
        <Eye className="mr-2 h-3.5 w-3.5" />
        Preview
      </DropdownMenuItem>

      {open && (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Preview — {template.title}</AlertDialogTitle>
              <AlertDialogDescription>
                Raw HTML preview with variable tokens shown as-is.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div
              className="max-h-[60vh] overflow-y-auto rounded-md border bg-white dark:bg-neutral-950 p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: template.htmlContent }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}


function DeleteConfirm({
  template,
  onDelete,
  isPending,
}: {
  template: DocumentTemplate;
  onDelete: (id: number) => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => e.preventDefault()}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{template.title}&rdquo; will be deactivated. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onDelete(template.id)}
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


interface DefaultStarButtonProps {
  template: DocumentTemplate;
  currentDefault: DocumentTemplate | undefined;
  onSetDefault: (id: number, isDefault: boolean) => void;
  isPending: boolean;
}

function DefaultStarButton({ template, currentDefault, onSetDefault, isPending }: DefaultStarButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCurrentDefault = template.isDefault;
  const hasExistingDefault = !!currentDefault && !isCurrentDefault;

  const handleClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmOpenChange = useCallback((val: boolean) => setConfirmOpen(val), []);

  const handleConfirm = useCallback(() => {
    onSetDefault(template.id, !isCurrentDefault);
    setConfirmOpen(false);
  }, [template.id, isCurrentDefault, onSetDefault]);

  const confirmTitle = isCurrentDefault
    ? "Remove default status?"
    : "Set as default template?";

  const confirmDescription = isCurrentDefault
    ? "Are you sure you want to remove the default status from this template?"
    : hasExistingDefault
    ? `This will replace "${currentDefault.title}" as the default template. Continue?`
    : "Set this template as the default?";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0 transition-colors",
          isCurrentDefault
            ? "text-amber-500 hover:text-amber-600"
            : "text-muted-foreground/40 hover:text-amber-400"
        )}
        onClick={handleClick}
        disabled={isPending}
        aria-label={isCurrentDefault ? "Remove default status" : "Set as default"}
        title={isCurrentDefault ? "Remove default status" : "Set as default"}
      >
        <Star className={cn("h-4 w-4", isCurrentDefault && "fill-amber-500")} />
      </Button>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Confirm"
        variant="default"
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
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
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
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
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-b">
            {["Title", "Type", "Variables", "Version", "Status", "Created"].map((h) => (
              <Skeleton key={h} className="h-3" style={{ width: `${h.length * 9}px` }} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b last:border-0">
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


export default function DocumentTemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useDocumentTemplates();
  const deleteMutation = useDeleteDocumentTemplate();
  const setDefaultMutation = useSetDocumentTemplateDefault();

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Template deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteMutation]
  );

  const handleSetDefault = useCallback(
    (id: number, isDefault: boolean) => {
      setDefaultMutation.mutate(
        { id, isDefault },
        {
          onSuccess: () =>
            toast.success(isDefault ? "Template set as default" : "Default status removed"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [setDefaultMutation]
  );

  if (isLoading) return <TemplatesPageSkeleton />;

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
        <Button size="sm" className="gap-2" asChild>
          <Link href="/hr/documents/templates/new">
            <FilePlus2 className="h-4 w-4" />
            Add Template
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Templates" value={total} icon={FileText} color="blue" index={0} />
          <StatCard label="Active" value={active} icon={FileCheck} color="green" index={1} />
          <StatCard label="NDAs" value={ndaCount} icon={FileLock} color="red" index={2} />
          <StatCard label="Offer Letters" value={offerCount} icon={FileKey} color="amber" index={3} />
        </div>

        {list.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
            title="No templates yet"
            description="Create your first document template to automate offer letters, NDAs, and more."
            action={{ label: "Create your first template", href: "/hr/documents/templates/new" }}
          />
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[780px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[32px]" />
                      <TableHead className="w-[220px]">Title</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead className="w-[80px] text-center">Version</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[120px]">Created</TableHead>
                      <TableHead className="w-[56px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((template) => {
                      const cfg = getTypeConfig(template.type);
                      const TypeIcon = cfg.icon;
                      return (
                        <TableRow key={template.id} className="group">
                          <TableCell>
                            <DefaultStarButton
                              template={template}
                              currentDefault={currentDefault}
                              onSetDefault={handleSetDefault}
                              isPending={setDefaultMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm truncate">{template.title}</span>
                              {template.isDefault && (
                                <Badge variant="outline" className="text-[10px] px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] px-2 py-0.5 ${cfg.className}`}
                            >
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <VariableChips variables={template.variables ?? []} />
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            v{template.version}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                template.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                                  : "bg-muted text-muted-foreground border-border text-[11px]"
                              }
                            >
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {template.createdAt
                              ? format(new Date(template.createdAt), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Template actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/hr/documents/templates/${template.id}/edit`)
                                  }
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <PreviewDialog template={template} />
                                <DropdownMenuSeparator />
                                <DeleteConfirm
                                  template={template}
                                  onDelete={handleDelete}
                                  isPending={deleteMutation.isPending}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
