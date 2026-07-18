"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Pencil, FlaskConical } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import {
  useValidationRules, useCreateValidationRule, useUpdateValidationRule,
  useDeleteValidationRule, useTestValidationRules, useCrmMetadata,
} from "@/hooks/api/crm";
import {
  RuleSheet, buildRuleConfig, type RuleFormValues,
} from "@/features/crm/settings/validation-rule-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { CrmValidationRule, CrmValidationEntityType, CrmValidationRuleType } from "@/types/crm/metadata";

const ENTITY_TABS: { value: CrmValidationEntityType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "quote", label: "Quote" },
];

const RULE_TYPE_COLORS: Record<CrmValidationRuleType, string> = {
  required: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  email: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  phone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  url: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  regex: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  numeric_min: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  numeric_max: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  currency_min: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  currency_max: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  date_not_past: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  date_not_future: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  unique: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  conditional_required: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  stage_required: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  source_required: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
};

interface TestPanelProps {
  entityType: CrmValidationEntityType;
}

function TestPanel({ entityType }: TestPanelProps) {
  const [fieldKey, setFieldKey] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [record, setRecord] = useState<Record<string, unknown>>({});
  const testMutation = useTestValidationRules();

  const handleFieldKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldKey(e.target.value), []);
  const handleFieldValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.value), []);

  const handleAddField = useCallback(() => {
    if (!fieldKey.trim()) return;
    setRecord((prev) => ({ ...prev, [fieldKey.trim()]: fieldValue }));
    setFieldKey("");
    setFieldValue("");
  }, [fieldKey, fieldValue]);

  const handleRemoveField = useCallback((key: string) => {
    setRecord((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const handleRunTest = useCallback(() => {
    testMutation.mutate(
      { entityType, record },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [testMutation, entityType, record]);

  const errors = testMutation.data?.errors;
  const errorEntries = errors ? Object.entries(errors) : [];

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Test Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <Input value={fieldKey} onChange={handleFieldKeyChange} placeholder="field name" className="text-xs flex-1" />
          <Input value={fieldValue} onChange={handleFieldValueChange} placeholder="value" className="text-xs flex-1" />
          <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={handleAddField}>Add</Button>
        </div>
        {Object.keys(record).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(record).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className="inline-flex items-center gap-1 text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                onClick={() => handleRemoveField(k)}
              >
                <span className="font-mono text-muted-foreground">{k}</span>
                <span>:</span>
                <span>{String(v)}</span>
                <span className="text-muted-foreground ml-0.5">×</span>
              </button>
            ))}
          </div>
        )}
        <LoadingButton type="button" size="sm" onClick={handleRunTest} isPending={testMutation.isPending} loadingText="Running…">
          Run Test
        </LoadingButton>
        {testMutation.data && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Result</div>
            {errorEntries.length === 0 ? (
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-medium dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                All rules pass
              </span>
            ) : (
              <div className="space-y-1">
                {errorEntries.map(([field, message]) => (
                  <div key={field} className="flex items-start gap-1.5">
                    <span className="font-mono text-[9px] bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5 shrink-0 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30">{field}</span>
                    <span className="text-muted-foreground text-[10px]">{message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditRuleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="w-7" onClick={onClick} aria-label="Edit rule">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

function DeleteRuleButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="w-7 text-destructive" onClick={onClick} aria-label="Delete rule" {...hoverHandlers}>
      <Trash2Icon ref={iconRef} size={14} />
    </Button>
  );
}

interface EntityRulesTabProps {
  entityType: CrmValidationEntityType;
  onNewRule: () => void;
}

function EntityRulesTab({ entityType, onNewRule }: EntityRulesTabProps) {
  const { data: rules, isLoading, isError, refetch } = useValidationRules({ entity: entityType });
  const { data: metadata } = useCrmMetadata();
  const updateRule = useUpdateValidationRule();
  const deleteRule = useDeleteValidationRule();
  const createRule = useCreateValidationRule();
  const [editingRule, setEditingRule] = useState<CrmValidationRule | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const pipelineMap = new Map((metadata?.pipelines ?? []).map((p) => [p.id, p.name]));

  const handleToggle = useCallback((id: string, current: boolean) => {
    updateRule.mutate(
      { id, isActive: !current },
      { onSuccess: () => toast.success("Rule updated"), onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [updateRule]);

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Rule deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleEditOpen = useCallback((rule: CrmValidationRule) => setEditingRule(rule), []);
  const handleEditSheetChange = useCallback((open: boolean) => { if (!open) setEditingRule(null); }, []);

  const handleSheetSubmit = useCallback((data: RuleFormValues, isEdit: boolean) => {
    const config = buildRuleConfig(data);
    const payload = {
      entityType: data.entityType,
      field: data.field,
      ruleType: data.ruleType,
      config,
      pipelineId: data.pipelineId ?? null,
      stageKey: data.stageKey ?? null,
      sourceKey: data.sourceKey ?? null,
      errorMessage: data.errorMessage ?? null,
      isActive: data.isActive,
    };
    if (isEdit && editingRule) {
      updateRule.mutate(
        { id: editingRule.id, ...payload },
        { onSuccess: () => { toast.success("Rule updated"); setEditingRule(null); }, onError: (err) => toast.error(getErrorMessage(err)) }
      );
    } else {
      createRule.mutate(
        { ...payload, sortOrder: rules?.length ?? 0 },
        { onSuccess: () => toast.success("Rule created"), onError: (err) => toast.error(getErrorMessage(err)) }
      );
    }
  }, [editingRule, updateRule, createRule, rules?.length]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const getRuleKey = useCallback((rule: CrmValidationRule) => rule.id, []);
  const getRuleRowClassName = useCallback((rule: CrmValidationRule) => cn(!rule.isActive && "opacity-60"), []);

  const columns: DataTableColumn<CrmValidationRule>[] = [
    {
      key: "field",
      header: "Field",
      cell: (row): ReactNode => (
        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{row.field}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row): ReactNode => (
        <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 py-0 border", RULE_TYPE_COLORS[row.ruleType])}>
          {row.ruleType}
        </Badge>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      cell: (row): ReactNode => {
        const pipelineName = row.pipelineId ? pipelineMap.get(row.pipelineId) : undefined;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {pipelineName && (
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">{pipelineName}</span>
            )}
            {row.stageKey && (
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">stage:{row.stageKey}</span>
            )}
            {row.sourceKey && (
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">src:{row.sourceKey}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "sortOrder",
      header: "Order",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row): ReactNode => (
        <span className="text-[10px] text-muted-foreground">{row.sortOrder}</span>
      ),
    },
    {
      key: "active",
      header: "Active",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row): ReactNode => {
        const onToggleRow = () => handleToggle(row.id, row.isActive);
        return <Switch checked={row.isActive} onCheckedChange={onToggleRow} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => {
        const onEditRow = () => handleEditOpen(row);
        const onDeleteRow = () => handleDeleteRequest(row.id);
        return (
          <div className="flex items-center justify-end gap-1">
            <EditRuleButton onClick={onEditRow} />
            <DeleteRuleButton onClick={onDeleteRow} />
          </div>
        );
      },
    },
  ];

  const emptyState = (
    <EmptyState
      compact
      title="No rules for this entity"
      description="Add validation rules to enforce data quality on this entity type."
      action={{ label: "New Rule", onClick: onNewRule }}
      className="min-h-[20dvh] border-0 bg-transparent"
    />
  );

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>This validation rule will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RuleSheet
        open={!!editingRule}
        onOpenChange={handleEditSheetChange}
        editing={editingRule}
        entityType={entityType}
        rulesCount={rules?.length ?? 0}
        onSubmit={handleSheetSubmit}
        isPending={updateRule.isPending || createRule.isPending}
      />

      <div className="space-y-6">
        {isLoading ? (
          <DataTableSkeleton rows={12} columns={6} />
        ) : isError ? (
          <EmptyState
            compact
            title="Failed to load rules"
            description="Something went wrong loading validation rules."
            action={{ label: "Retry", onClick: handleRetry }}
            className="min-h-[20dvh] border-0 bg-transparent"
          />
        ) : (
          <Card className="bg-card rounded-lg border border-border shadow-sm">
            <DataTable
              data={rules ?? []}
              columns={columns}
              getRowKey={getRuleKey}
              rowClassName={getRuleRowClassName}
              emptyState={emptyState}
            />
          </Card>
        )}
        <TestPanel entityType={entityType} />
      </div>
    </>
  );
}

export default function ValidationRulesPage() {
  const [activeTab, setActiveTab] = useState<CrmValidationEntityType>("lead");
  const [sheetOpen, setSheetOpen] = useState(false);
  const createRule = useCreateValidationRule();
  const { data: rules } = useValidationRules({ entity: activeTab });

  const handleOpenNew = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((v: boolean) => setSheetOpen(v), []);
  const handleTabChange = useCallback((v: string) => setActiveTab(v as CrmValidationEntityType), []);

  const handleTopLevelSubmit = useCallback((data: RuleFormValues, isEdit: boolean) => {
    if (isEdit) return;
    const config = buildRuleConfig(data);
    createRule.mutate(
      {
        entityType: data.entityType,
        field: data.field,
        ruleType: data.ruleType,
        config,
        pipelineId: data.pipelineId ?? null,
        stageKey: data.stageKey ?? null,
        sourceKey: data.sourceKey ?? null,
        errorMessage: data.errorMessage ?? null,
        isActive: data.isActive,
        sortOrder: rules?.length ?? 0,
      },
      {
        onSuccess: () => { toast.success("Rule created"); setSheetOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createRule, rules?.length]);

  return (
    <>
      <RuleSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editing={null}
        entityType={activeTab}
        rulesCount={rules?.length ?? 0}
        onSubmit={handleTopLevelSubmit}
        isPending={createRule.isPending}
      />

      <PageWrapper
        title="Validation Rules"
        subtitle="Define field validation for CRM entities"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={16} onClick={handleOpenNew}>
            New Rule
          </AnimatedIconButton>
        }
      >
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            {ENTITY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          {ENTITY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <EntityRulesTab entityType={tab.value} onNewRule={handleOpenNew} />
            </TabsContent>
          ))}
        </Tabs>
      </PageWrapper>
    </>
  );
}
