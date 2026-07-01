"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getErrorMessage } from "@/lib/api-client";
import {
  useSalaryStructureTemplates,
  useCreateSalaryTemplate,
  useUpdateSalaryTemplate,
  useDeleteSalaryTemplate,
  type SalaryStructureTemplate,
  type CreateSalaryTemplateInput,
} from "@/hooks/api/hr/salary-structures";
import { SalaryStructureTemplateSheet } from "@/features/hr/payroll/salary-structure-template-sheet";
import SalaryStructuresLoading from "./loading";

function formatInr(value: string | null | undefined) {
  const n = parseFloat(value ?? "0");
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

interface TemplateCardProps {
  template: SalaryStructureTemplate;
  index: number;
  onEdit: (template: SalaryStructureTemplate) => void;
  onDelete: (template: SalaryStructureTemplate) => void;
}

function TemplateCard({ template, index, onEdit, onDelete }: TemplateCardProps) {
  function handleEdit() {
    onEdit(template);
  }

  function handleDelete() {
    onDelete(template);
  }

  const gross =
    parseFloat(template.basicSalary) +
    parseFloat(template.basicSalary) * parseFloat(template.hraPercent) / 100 +
    parseFloat(template.specialAllowance ?? "0") +
    parseFloat(template.medicalAllowance ?? "0") +
    parseFloat(template.travelAllowance ?? "0") +
    parseFloat(template.otherAllowances ?? "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-tight">{template.name}</h3>
        <Badge
          variant={template.isActive ? "default" : "secondary"}
          className={
            template.isActive
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px]"
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
          Gross {formatInr(String(gross))}/mo · HRA {template.hraPercent}%
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">PF</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{template.pfDeductionPercent ?? "12"}%</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
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
          className="h-8 px-3 text-xs gap-1.5 hover:bg-violet-50 hover:text-violet-700"
          onClick={handleEdit}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs gap-1.5 hover:bg-red-50 hover:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

export default function SalaryStructuresPage() {
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

  function handleOpenEdit(template: SalaryStructureTemplate) {
    setEditingTemplate(template);
    setSheetOpen(true);
  }

  function handleOpenDelete(template: SalaryStructureTemplate) {
    setDeletingTemplate(template);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditingTemplate(undefined);
  }

  async function handleFormSubmit(data: CreateSalaryTemplateInput) {
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

  if (isLoading) return <SalaryStructuresLoading />;

  return (
    <PageWrapper
      title="Salary Structure Templates"
      subtitle="Define reusable salary structures to assign to employees."
      actions={
        <Button
          onClick={handleOpenCreate}
          className="h-9 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center justify-center flex-1 h-full py-16">
          <EmptyState
            title="Failed to load templates"
            description="Something went wrong while fetching salary structure templates."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </div>
      ) : !templates || templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center justify-center flex-1 h-full py-16"
        >
          <EmptyState
            illustration={
              <LayoutTemplate className="h-16 w-16 text-muted-foreground/40" />
            }
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
