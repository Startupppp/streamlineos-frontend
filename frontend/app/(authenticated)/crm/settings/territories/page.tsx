"use client";

import { useState, useCallback } from "react";
import { MapPin, Plus, Trash2, Pencil, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

interface TerritoryRowProps {
  territory: Territory;
  onEdit: (t: Territory) => void;
  onToggle: (id: number, isActive: boolean) => void;
  onDeleteRequest: (id: number) => void;
}

function TerritoryRow({ territory, onEdit, onToggle, onDeleteRequest }: TerritoryRowProps) {
  const handleEdit = useCallback(() => onEdit(territory), [territory, onEdit]);
  const handleToggle = useCallback(() => onToggle(territory.id, territory.isActive), [territory.id, territory.isActive, onToggle]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(territory.id), [territory.id, onDeleteRequest]);

  return (
    <TableRow className={cn("h-9 hover:bg-muted/30 transition-colors", !territory.isActive && "opacity-60")}>
      <TableCell className="text-[11px] px-2 py-1 font-medium">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          {territory.name}
        </div>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-muted-foreground max-w-[220px] truncate">
        {summarizeCriteria(territory)}
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-center">
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border">
          {territory.priority}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-center">
        <Switch checked={territory.isActive} onCheckedChange={handleToggle} />
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit territory">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete territory">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
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
          <Eye className="h-4 w-4 text-blue-500" />
          Preview Territory Match
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">City</label>
            <Input value={city} onChange={handleCityChange} placeholder="Mumbai" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">State</label>
            <Input value={state} onChange={handleStateChange} placeholder="Maharashtra" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Country</label>
            <Input value={country} onChange={handleCountryChange} placeholder="India" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Industry</label>
            <Input value={industry} onChange={handleIndustryChange} placeholder="Technology" className="h-8 text-xs" />
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
            <div className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Result</div>
            {preview.data.matchedTerritory ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                  Match
                </Badge>
                <span className="font-medium">{preview.data.matchedTerritory.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border">
                  No match
                </Badge>
                <span className="text-muted-foreground">No territory matched this lead</span>
              </div>
            )}
            {preview.data.assignedReps.length > 0 && (
              <div className="text-muted-foreground">
                Assigned reps: {preview.data.assignedReps.join(", ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  const count = territories?.length ?? 0;
  const isPending = createTerritory.isPending || updateTerritory.isPending;

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
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Territory
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            illustration={<EmptyTargetIllustration />}
            title="Failed to load territories"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-6">
            {territories && territories.length > 0 ? (
              <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Criteria</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-center">Priority</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-center">Active</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {territories.map((t) => (
                        <TerritoryRow
                          key={t.id}
                          territory={t}
                          onEdit={handleStartEdit}
                          onToggle={handleToggleActive}
                          onDeleteRequest={handleDeleteRequest}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                illustration={<EmptyTargetIllustration />}
                title="No territories"
                description="Define geographic or segment-based territories to automatically route leads to the right reps."
                action={{ label: "New Territory", onClick: handleOpenNew }}
                className="flex-1 min-h-[40vh] border-0 bg-transparent"
              />
            )}
            <PreviewPanel />
          </div>
        )}
      </PageWrapper>
    </>
  );
}
