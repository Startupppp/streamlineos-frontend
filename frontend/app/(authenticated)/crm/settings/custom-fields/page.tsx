"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordList } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { CustomFieldSheet } from "@/features/crm/settings/custom-fields/custom-field-sheet";
import { useCan } from "@/hooks/api/access";
import {
  useCustomFields,
  useDeleteCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
} from "@/hooks/api/crm/custom-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import { CUSTOM_FIELD_LAYOUT } from "@/lib/renderer/crm/settings/custom-field-layout";

type EntityType = CustomFieldDefinition["entityType"];

const ENTITY_TABS: ReadonlyArray<{ value: EntityType; label: string; singular: string }> = [
  { value: "lead", label: "Leads", singular: "lead" },
  { value: "contact", label: "Contacts", singular: "contact" },
  { value: "deal", label: "Deals", singular: "deal" },
];

function isEntityType(value: string): value is EntityType {
  return ENTITY_TABS.some((tab) => tab.value === value);
}

/**
 * Custom fields.
 *
 * A table rather than the stack of cards this replaces. Every card carried one
 * line of content — a label, a key, a type chip — laid out horizontally inside a
 * card that then took a whole row of the page; a table shows the same facts as
 * columns, four times as many at once, and gains a real empty and loading state
 * on the way.
 *
 * The create and edit form stays hand-written, in a sheet rather than the dialog
 * it was: a choice field's options are pairs, added one at a time, and that is
 * work with a length rather than one decision.
 */
export default function CustomFieldsPage() {
  const layout = useTenantLayout(CUSTOM_FIELD_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("settings:custom-fields:manage");

  const [entityType, setEntityType] = useState<EntityType>("lead");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomFieldDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinition | null>(null);

  const { data, isLoading, isError, refetch } = useCustomFields(entityType);
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const fields = useMemo(() => data?.fields ?? [], [data]);
  const entity = ENTITY_TABS.find((tab) => tab.value === entityType) ?? ENTITY_TABS[0];

  const rows = useMemo(
    () =>
      fields.map((field) => ({
        id: field.id,
        label: field.label,
        name: field.name,
        fieldType: field.fieldType,
        optionCount: field.fieldType === "select" ? (field.options?.length ?? 0) : null,
        isRequired: field.isRequired,
        isActive: field.isActive,
        sortOrder: field.sortOrder,
      })),
    [fields],
  );

  const handleTabChange = useCallback((value: string) => {
    if (isEntityType(value)) setEntityType(value);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleToggle = useCallback(
    (field: CustomFieldDefinition) => {
      updateField.mutate(
        { id: field.id, entityType: field.entityType, isActive: !field.isActive },
        {
          onSuccess: () => toast.success(field.isActive ? "Field hidden" : "Field shown"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateField],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteField.mutate(
      { id: deleteTarget.id, entityType: deleteTarget.entityType },
      {
        onSuccess: () => {
          toast.success("Field deleted");
          setDeleteTarget(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setDeleteTarget(null);
        },
      },
    );
  }, [deleteField, deleteTarget]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const field = fields.find((candidate) => candidate.id === row.id);
      if (!field || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${field.label}`}
          deleteLabel={`Delete ${field.label}`}
          leading={
            <Switch
              checked={field.isActive}
              onCheckedChange={() => handleToggle(field)}
              aria-label={field.isActive ? `Hide ${field.label}` : `Show ${field.label}`}
            />
          }
          onEdit={() => {
            setEditTarget(field);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(field)}
        />
      );
    },
    [fields, canManage, handleToggle],
  );

  return (
    <PageWrapper
      title="Custom fields"
      subtitle="Fields of your own, alongside the ones the product ships with."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Tabs value={entityType} onValueChange={handleTabChange}>
            <TabsList>
              {ENTITY_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New field
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="settings:custom-fields:manage"
            className={CONTENT_FILL_PANEL}
            description="Custom fields are defined by whoever administers your workspace."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load custom fields"
            description="The field list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title={`No custom fields on ${entity?.label.toLowerCase() ?? "records"} yet`}
            description={`Add a field of your own and it appears on every ${entity?.singular ?? "record"}, on the form and in the list.`}
            action={{ label: "New field", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            actions={rowActions}
            density={density}
            minWidth="820px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <CustomFieldSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        entityType={entityType}
        field={editTarget}
        sortOrder={fields.length}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this field?"
        description={
          deleteTarget
            ? `${deleteTarget.label} will be removed from every record, and every value already stored in it is lost. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete field"
        destructive
        isPending={deleteField.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
