"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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

const CATEGORY_COLORS: Record<string, string> = {
  Sales: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Finance: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Operations: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  HR: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Customer: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground dark:bg-slate-800/40 dark:text-slate-400";
}

interface KpiFormState {
  name: string;
  category: string;
  description: string;
  unit: string;
  target: string;
  weight: string;
}

function KpiDeleteButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      onClick={onClick}
      className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </button>
  );
}

export function KpiLibraryTab() {
  const { data: kpis = [], isLoading } = useKpis();
  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpi = useDeleteKpi();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<KpiFormState>({
    name: "",
    category: "",
    description: "",
    unit: "",
    target: "",
    weight: "1",
  });

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
      await updateKpi.mutateAsync({ id, isActive: !current });
      toast.success(current ? "KPI deactivated" : "KPI activated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this KPI?")) return;
    try {
      await deleteKpi.mutateAsync(id);
      toast.success("KPI deleted");
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

  if (isLoading) {
    return (
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
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-nowrap items-center justify-between gap-3 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <SearchInput
            className="w-60"
            placeholder="Search KPIs…"
            value={search}
            onValueChange={setSearch}
          />
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground dark:hover:border-primary/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }}>
              <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2">
                Add KPI
              </AnimatedIconButton>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="flex w-[420px] flex-col gap-0 overflow-hidden p-0">
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
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createKpi.isPending}
                >
                  {createKpi.isPending ? "Creating…" : "Create KPI"}
                </Button>
              </motion.div>
            </SheetBody>
          </SheetContent>
        </Sheet>
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
              transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{kpi.name}</h3>
                  {kpi.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{kpi.description}</p>
                  )}
                </div>
                <KpiDeleteButton onClick={() => handleDelete(kpi.id)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={`text-xs ${getCategoryColor(kpi.category)}`}>{kpi.category}</Badge>
                <Badge className={`text-xs ${kpi.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground dark:bg-slate-800/40 dark:text-slate-400"}`}>
                  {kpi.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                {kpi.unit && <div><span className="font-medium text-foreground">{kpi.unit}</span><br />Unit</div>}
                {kpi.target && <div><span className="font-medium text-foreground">{kpi.target}</span><br />Target</div>}
                <div><span className="font-medium text-foreground">{kpi.weight}</span><br />Weight</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className={`w-full text-xs ${kpi.isActive ? "text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10" : "text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-500/10"}`}
                onClick={() => handleToggleActive(kpi.id, kpi.isActive)}
              >
                {kpi.isActive ? "Deactivate" : "Activate"}
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
