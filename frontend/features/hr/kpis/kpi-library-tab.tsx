"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { useKpis, useCreateKpi, useUpdateKpi, useDeleteKpi } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

const CATEGORY_COLORS: Record<string, string> = {
  // Five business functions, not five statuses: Finance and HR both read "info"
  // and were the same chip. HR takes violet rather than the blue it shared.
  Sales: "bg-category-emerald-surface text-category-emerald-ink",
  Finance: "bg-category-blue-surface text-category-blue-ink",
  Operations: "bg-category-amber-surface text-category-amber-ink",
  HR: "bg-category-violet-surface text-category-violet-ink",
  Customer: "bg-category-pink-surface text-category-pink-ink",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground";
}

interface KpiFormState {
  name: string;
  category: string;
  description: string;
  unit: string;
  target: string;
  weight: string;
}

export function KpiLibraryTab() {
  const { data: kpis = [], isLoading, isError, error, refetch } = useKpis();
  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpi = useDeleteKpi();
  const canManage = useCan("hr:performance:manage");
  const pageState = usePageState({ permission: "hr:performance:view", isLoading, isError, error });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState<KpiFormState>({
    name: "",
    category: "",
    description: "",
    unit: "",
    target: "",
    weight: "1",
  });

  function handleRetry() { void refetch(); }

  function handleFormChange(field: keyof KpiFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.name || !form.category) {
      toast.error("Name and category are required");
      return;
    }
    try {
      await createKpi.mutateAsync({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        unit: form.unit || undefined,
        target: form.target || undefined,
        weight: form.weight || "1",
      });
      toast.success("KPI created");
      setSheetOpen(false);
      setForm({ name: "", category: "", description: "", unit: "", target: "", weight: "1" });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function handleToggleActive(id: number, current: boolean) {
    try {
      await updateKpi.mutateAsync({ kpiId: id, isActive: !current });
      toast.success(current ? "KPI deactivated" : "KPI activated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteKpi.mutateAsync(deleteTarget.id);
      toast.success("KPI deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  const categories = ["ALL", ...Array.from(new Set(kpis.map((k) => k.category)))];
  const filtered = kpis.filter((k) => {
    const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "ALL" || k.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const loadingSkeleton = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3 animate-pulse">
            <div className="h-5 w-2/3 bg-muted rounded" />
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
  );

  return (
    <PageState resolution={pageState} loading={loadingSkeleton} onRetry={handleRetry} className="flex-1">
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder="Search KPIs…"
            value={search}
            onValueChange={setSearch}
          />
          <FilterPillGroup className="min-w-0">
            {categories.map((cat) => (
              <FilterPill
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </FilterPill>
            ))}
          </FilterPillGroup>
        </div>
        {canManage && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2">
              Add KPI
            </AnimatedIconButton>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left gap-1">
              <SheetTitle>Create KPI</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} placeholder="KPI name" />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => handleFormChange("category", e.target.value)} placeholder="e.g. Sales, Finance" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => handleFormChange("description", e.target.value)} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input value={form.unit} onChange={(e) => handleFormChange("unit", e.target.value)} placeholder="e.g. %, $" />
                </div>
                <div className="space-y-1.5">
                  <Label>Target</Label>
                  <Input type="number" value={form.target} onChange={(e) => handleFormChange("target", e.target.value)} placeholder="e.g. 100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input type="number" value={form.weight} onChange={(e) => handleFormChange("weight", e.target.value)} placeholder="1" />
              </div>
              <LoadingButton
                className="w-full"
                onClick={handleCreate}
                isPending={createKpi.isPending}
                loadingText="Creating…"
              >
                Create KPI
              </LoadingButton>
            </SheetBody>
          </SheetContent>
        </Sheet>
        )}
      </div>

      {filtered.length === 0 ? (
        <ChartEmptyState message="No KPIs found" height={220} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: Math.min(i, 8) * 0.04 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <TruncatedText text={kpi.name} className="font-semibold text-foreground" />
                  {kpi.description && (
                    <TruncatedText text={kpi.description} lines={2} className="text-xs text-muted-foreground mt-0.5" />
                  )}
                </div>
                {canManage && (
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    variant="ghost"
                    size="icon"
                    className="ml-2 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete KPI ${kpi.name}`}
                    onClick={() => setDeleteTarget({ id: kpi.id, name: kpi.name })}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={`text-xs ${getCategoryColor(kpi.category)}`}>{kpi.category}</Badge>
                <Badge className={`text-xs ${kpi.isActive ? "bg-status-success-surface text-status-success-ink" : "bg-muted text-muted-foreground"}`}>
                  {kpi.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                {kpi.unit && <div><span className="font-medium text-foreground">{kpi.unit}</span><br />Unit</div>}
                {kpi.target && <div><span className="font-medium text-foreground">{kpi.target}</span><br />Target</div>}
                <div><span className="font-medium text-foreground">{kpi.weight}</span><br />Weight</div>
              </div>
              {canManage && <Button
                size="sm"
                variant="outline"
                disabled={updateKpi.isPending}
                className={`w-full ${kpi.isActive ? "text-destructive border-destructive/30 hover:bg-destructive/10" : "text-status-success-ink border-status-success-rule hover:bg-status-success-surface"}`}
                onClick={() => handleToggleActive(kpi.id, kpi.isActive)}
              >
                {kpi.isActive ? "Deactivate" : "Activate"}
              </Button>}
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete KPI"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        isPending={deleteKpi.isPending}
      />
    </div>
    </PageState>
  );
}
