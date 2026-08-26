"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { MapPin, Pencil, Eye } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useTerritories, useCreateTerritory, useUpdateTerritory,
  useDeleteTerritory, usePreviewTerritory, type Territory,
} from "@/hooks/api/crm-settings";
import {
  TerritorySheet, buildTerritoryPayload, type TerritoryFormValues,
} from "@/features/crm/settings/territory-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

function summarizeCriteria(t: Territory): string {
  const parts: string[] = [];
  const c = t.criteria;
  if (c.countries?.length) parts.push(`Countries: ${c.countries.slice(0, 2).join(", ")}${c.countries.length > 2 ? "…" : ""}`);
  if (c.industries?.length) parts.push(`Industry: ${c.industries.slice(0, 2).join(", ")}${c.industries.length > 2 ? "…" : ""}`);
  if ((c.states?.length ?? t.states.length)) {
    const st = c.states ?? t.states;
    parts.push(`States: ${st.slice(0, 2).join(", ")}${st.length > 2 ? "…" : ""}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "No criteria";
}

function PreviewPanel() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");

  const preview = usePreviewTerritory();

  const handleRunPreview = useCallback(() => {
    preview.mutate(
      { city: city || undefined, state: state || undefined, country: country || undefined, industry: industry || undefined },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [preview, city, state, country, industry]);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value), []);
  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setState(e.target.value), []);
  const handleCountryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value), []);
  const handleIndustryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setIndustry(e.target.value), []);

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Preview Territory Match
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">City</label>
            <Input value={city} onChange={handleCityChange} placeholder="Mumbai" className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">State</label>
            <Input value={state} onChange={handleStateChange} placeholder="Maharashtra" className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Country</label>
            <Input value={country} onChange={handleCountryChange} placeholder="India" className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Industry</label>
            <Input value={industry} onChange={handleIndustryChange} placeholder="Technology" className="text-xs" />
          </div>
        </div>
        <LoadingButton
          type="button"
          size="sm"
          onClick={handleRunPreview}
          isPending={preview.isPending}
          loadingText="Checking..."
        >
          Run Preview
        </LoadingButton>
        {preview.data && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-semibold text-dense uppercase tracking-wide text-muted-foreground">Result</div>
            {preview.data.matchedTerritory ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-micro h-4 px-1.5 bg-status-success-surface text-status-success-ink border-status-success-rule">
                  Match
                </Badge>
                <span className="font-medium">{preview.data.matchedTerritory.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-micro h-4 px-1.5 bg-muted text-muted-foreground border-border">
                  No match
                </Badge>
                <span className="text-muted-foreground">No territory matched this lead</span>
              </div>
            )}
            {preview.data.assignedRepNames.length > 0 && (
              <div className="text-muted-foreground">
                Assigned reps: {preview.data.assignedRepNames.join(", ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteTerritoryButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="w-7 text-destructive" onClick={onClick} {...hoverHandlers}>
      <Trash2Icon ref={iconRef} size={14} />
    </Button>
  );
}

function buildColumns(
  onEdit: (t: Territory) => void,
  onToggle: (id: number, isActive: boolean) => void,
  onDeleteRequest: (id: number) => void,
): DataTableColumn<Territory>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (row): ReactNode => (
        <div className="flex items-center gap-1.5 text-dense font-medium">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          {row.name}
        </div>
      ),
    },
    {
      key: "criteria",
      header: "Criteria",
      cell: (row): ReactNode => (
        <span className="text-dense text-muted-foreground max-w-[220px] truncate block">
          {summarizeCriteria(row)}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row): ReactNode => (
        <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border">
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "active",
      header: "Active",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row): ReactNode => {
        const handleToggle = () => onToggle(row.id, row.isActive);
        return <Switch checked={row.isActive} onCheckedChange={handleToggle} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => {
        const handleEdit = () => onEdit(row);
        const handleDelete = () => onDeleteRequest(row.id);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="w-7" onClick={handleEdit} aria-label="Edit territory">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <DeleteTerritoryButton onClick={handleDelete} />
          </div>
        );
      },
    },
  ];
}

export default function TerritoriesPage() {
  const { data: territories, isLoading, isError, refetch } = useTerritories();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();
  const deleteTerritory = useDeleteTerritory();

  const handleOpenNew = useCallback(() => {
    setEditingTerritory(null);
    setSheetOpen(true);
  }, []);

  const handleStartEdit = useCallback((t: Territory) => {
    setEditingTerritory(t);
    setSheetOpen(true);
  }, []);

  const handleToggleActive = useCallback((id: number, currentActive: boolean) => {
    updateTerritory.mutate(
      { id, isActive: !currentActive },
      {
        onSuccess: () => toast.success("Territory updated"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updateTerritory]);

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteTerritory.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Territory deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deleteTerritory, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) handleDeleteCancel();
  }, [handleDeleteCancel]);

  const handleSheetSubmit = useCallback((data: TerritoryFormValues) => {
    const payload = buildTerritoryPayload(data);
    if (editingTerritory) {
      updateTerritory.mutate(
        { id: editingTerritory.id, ...payload },
        {
          onSuccess: () => { toast.success("Territory updated"); setSheetOpen(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    } else {
      createTerritory.mutate(payload, {
        onSuccess: () => { toast.success("Territory created"); setSheetOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [editingTerritory, updateTerritory, createTerritory]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const getTerritoryKey = useCallback((t: Territory) => String(t.id), []);
  const getTerritoryRowClassName = useCallback((t: Territory) => cn(!t.isActive && "opacity-60"), []);

  const columns = buildColumns(handleStartEdit, handleToggleActive, handleDeleteRequest);

  const count = territories?.length ?? 0;
  const isPending = createTerritory.isPending || updateTerritory.isPending;

  const emptyState = (
    <EmptyState
      illustration={<EmptyTargetIllustration />}
      title="No territories"
      description="Define geographic or segment-based territories to automatically route leads to the right reps."
      action={{ label: "New Territory", onClick: handleOpenNew }}
      className="flex-1 min-h-[40dvh] border-0 bg-transparent"
    />
  );

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Territory</AlertDialogTitle>
            <AlertDialogDescription>
              This territory will be permanently deleted and leads will no longer be assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TerritorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editingTerritory}
        isPending={isPending}
        onSubmit={handleSheetSubmit}
      />

      <PageWrapper
        title="Territories"
        subtitle={isLoading ? undefined : `${count} territor${count !== 1 ? "ies" : "y"} defined`}
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={16} onClick={handleOpenNew}>New Territory</AnimatedIconButton>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            <DataTableSkeleton rows={12} columns={5} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load territories"
            description="The territory list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <DataTable
              data={territories ?? []}
              columns={columns}
              getRowKey={getTerritoryKey}
              rowClassName={getTerritoryRowClassName}
              emptyState={emptyState}
              className="flex-1 min-h-0"
            />
            <PreviewPanel />
          </div>
        )}
      </PageWrapper>
    </>
  );
}
