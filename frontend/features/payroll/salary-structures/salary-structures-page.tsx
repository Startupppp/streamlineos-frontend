"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Pencil, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useSalaryStructureTemplates,
  useCreateSalaryTemplate,
  useUpdateSalaryTemplate,
  useDeleteSalaryTemplate,
  type SalaryStructureTemplate,
  type CreateSalaryTemplateInput,
} from "@/hooks/api/hr/salary-structures";
import { SalaryStructureTemplateSheet } from "@/features/payroll/salary-structures/salary-structure-template-sheet";

function formatInr(value: string | null | undefined) {
  const n = parseFloat(value ?? "0");
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function calcGross(template: SalaryStructureTemplate): number {
  const basic = parseFloat(template.basicSalary);
  return (
    basic +
    (basic * parseFloat(template.hraPercent)) / 100 +
    parseFloat(template.specialAllowance ?? "0") +
    parseFloat(template.medicalAllowance ?? "0") +
    parseFloat(template.travelAllowance ?? "0") +
    parseFloat(template.otherAllowances ?? "0")
  );
}

interface TemplateCardProps {
  template: SalaryStructureTemplate;
  index: number;
  onEdit: (t: SalaryStructureTemplate) => void;
  onDelete: (t: SalaryStructureTemplate) => void;
}

const TemplateCard = memo(function TemplateCard({ template, index, onEdit, onDelete }: TemplateCardProps) {
  const shouldReduceMotion = useReducedMotion();
  function handleEdit() { onEdit(template); }
  function handleDelete() { onDelete(template); }

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <TruncatedText text={template.name} className="min-w-0 flex-1 text-sm font-semibold text-foreground leading-tight" />
        <Badge
          variant={template.isActive ? "default" : "secondary"}
          className={
            template.isActive
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px] dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
              : "text-[11px]"
          }
        >
          {template.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {formatInr(template.basicSalary)}
          <span className="text-xs font-normal text-muted-foreground ml-1">basic/mo</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gross {formatInr(String(calcGross(template)))}/mo · HRA {template.hraPercent}%
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">PF</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{template.pfDeductionPercent ?? "12"}%</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Prof Tax</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{formatInr(template.professionalTax)}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        From {template.effectiveFrom}
        {template.effectiveTo ? ` → ${template.effectiveTo}` : " · No end date"}
      </p>

      <div className="flex gap-2 pt-1 border-t border-border/50">
        <Button
          size="sm"
          variant="ghost"
          className="px-3 text-xs gap-1.5"
          onClick={handleEdit}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <AnimatedIconButton
          icon={Trash2Icon}
          iconClassName="mr-1.5"
          size="sm"
          variant="ghost"
          className="px-3 text-xs text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          Delete
        </AnimatedIconButton>
      </div>
    </motion.div>
  );
});

export function SalaryStructuresPageContent() {
  const shouldReduceMotion = useReducedMotion();
  const { data: templates, isLoading, isError, refetch } = useSalaryStructureTemplates();
  const createMutation = useCreateSalaryTemplate();
  const updateMutation = useUpdateSalaryTemplate();
  const deleteMutation = useDeleteSalaryTemplate();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SalaryStructureTemplate | undefined>();
  const [deletingTemplate, setDeletingTemplate] = useState<SalaryStructureTemplate | undefined>();

  function handleOpenCreate() {
    setEditingTemplate(undefined);
    setSheetOpen(true);
  }

  const handleOpenEdit = useCallback((template: SalaryStructureTemplate) => {
    setEditingTemplate(template);
    setSheetOpen(true);
  }, []);

  const handleOpenDelete = useCallback((template: SalaryStructureTemplate) => {
    setDeletingTemplate(template);
  }, []);

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditingTemplate(undefined);
  }

  function handleFormSubmit(data: CreateSalaryTemplateInput) {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: () => {
            toast.success("Template updated successfully");
            setSheetOpen(false);
            setEditingTemplate(undefined);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Template created successfully");
          setSheetOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  function handleConfirmDelete() {
    if (!deletingTemplate) return;
    deleteMutation.mutate(deletingTemplate.id, {
      onSuccess: () => {
        toast.success("Template deactivated");
        setDeletingTemplate(undefined);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeletingTemplate(undefined);
      },
    });
  }

  function handleCancelDelete() {
    setDeletingTemplate(undefined);
  }

  function handleRetry() {
    void refetch();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <PageWrapper title="Salary Structure Templates" subtitle="Loading…">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl border border-border" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary Structure Templates"
      subtitle="Reusable compensation templates — per-employee structures are managed from Employees."
      actions={
        <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
          Add Template
        </AnimatedIconButton>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span>
          Per-employee salary structures and overrides are managed from the{" "}
          <Link href="/payroll/employees" className="text-accent underline-offset-2 hover:underline font-medium">
            Employees
          </Link>{" "}
          page.
        </span>
      </div>

      {isError ? (
        <EmptyState
          title="Failed to load templates"
          description="Something went wrong while fetching salary structure templates."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      ) : !templates || templates.length === 0 ? (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <EmptyState
            illustrationPreset="documents"
            title="No salary structure templates yet"
            description="Create your first template to standardise employee compensation structures."
            action={{ label: "Add Template", onClick: handleOpenCreate }}
          />
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, idx) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={idx}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <SalaryStructureTemplateSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        template={editingTemplate}
        onSubmit={handleFormSubmit}
        isPending={isPending}
      />

      <AlertDialog open={!!deletingTemplate} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <span className="font-semibold text-foreground">{deletingTemplate?.name}</span>.
              The template will no longer be available for new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
