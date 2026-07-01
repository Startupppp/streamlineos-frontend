"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BarChart2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useKpis,
  useCreateKpi,
  useUpdateKpi,
  useDeleteKpi,
  useCompetencyFrameworks,
  useCreateCompetencyFramework,
  useCreateCompetency,
  type CompetencyFramework,
} from "@/hooks/api/hr";

interface KpiFormState {
  name: string;
  category: string;
  description: string;
  unit: string;
  target: string;
  weight: string;
}

interface FrameworkLevel {
  level: number;
  label: string;
  description: string;
}

interface FrameworkFormState {
  name: string;
  description: string;
  ratingScale: string;
  levels: FrameworkLevel[];
}

interface CompetencyFormState {
  name: string;
  category: string;
  description: string;
  weight: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Sales: "bg-emerald-100 text-emerald-700",
  Finance: "bg-blue-100 text-blue-700",
  Operations: "bg-amber-100 text-amber-700",
  HR: "bg-violet-100 text-violet-700",
  Customer: "bg-pink-100 text-pink-700",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-600";
}

function KpiLibraryTab() {
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
    } catch {
      toast.error("Failed to create KPI");
    }
  }

  async function handleToggleActive(id: number, current: boolean) {
    try {
      await updateKpi.mutateAsync({ id, isActive: !current });
      toast.success(current ? "KPI deactivated" : "KPI activated");
    } catch {
      toast.error("Failed to update KPI");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this KPI?")) return;
    try {
      await deleteKpi.mutateAsync(id);
      toast.success("KPI deleted");
    } catch {
      toast.error("Failed to delete KPI");
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 animate-pulse">
            <div className="h-5 w-2/3 bg-slate-200 rounded" />
            <div className="h-4 w-1/3 bg-slate-100 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Input
            className="w-60"
            placeholder="Search KPIs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                  categoryFilter === cat
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600"
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
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                Add KPI
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="w-[420px] p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create KPI</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={handleCreate}
                  disabled={createKpi.isPending}
                >
                  {createKpi.isPending ? "Creating…" : "Create KPI"}
                </Button>
              </motion.div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <BarChart2 className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">No KPIs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{kpi.name}</h3>
                  {kpi.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{kpi.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(kpi.id)}
                  className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={`text-xs ${getCategoryColor(kpi.category)}`}>{kpi.category}</Badge>
                <Badge className={`text-xs ${kpi.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {kpi.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                {kpi.unit && <div><span className="font-medium text-slate-700">{kpi.unit}</span><br />Unit</div>}
                {kpi.target && <div><span className="font-medium text-slate-700">{kpi.target}</span><br />Target</div>}
                <div><span className="font-medium text-slate-700">{kpi.weight}</span><br />Weight</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className={`w-full text-xs ${kpi.isActive ? "text-red-500 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
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

function CompetencyFrameworksTab() {
  const { data: frameworks = [], isLoading } = useCompetencyFrameworks();
  const createFramework = useCreateCompetencyFramework();
  const createCompetency = useCreateCompetency();

  const [frameworkSheetOpen, setFrameworkSheetOpen] = useState(false);
  const [competencyDialogFrameworkId, setCompetencyDialogFrameworkId] = useState<number | null>(null);

  const [frameworkForm, setFrameworkForm] = useState<FrameworkFormState>({
    name: "",
    description: "",
    ratingScale: "5",
    levels: [{ level: 1, label: "", description: "" }],
  });

  const [competencyForm, setCompetencyForm] = useState<CompetencyFormState>({
    name: "",
    category: "",
    description: "",
    weight: "1",
  });

  function handleFrameworkFormChange(field: keyof FrameworkFormState, value: string) {
    setFrameworkForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLevelChange(index: number, field: keyof FrameworkLevel, value: string) {
    setFrameworkForm((prev) => {
      const levels = [...prev.levels];
      levels[index] = { ...levels[index], [field]: field === "level" ? Number(value) : value };
      return { ...prev, levels };
    });
  }

  function addLevel() {
    setFrameworkForm((prev) => ({
      ...prev,
      levels: [
        ...prev.levels,
        { level: prev.levels.length + 1, label: "", description: "" },
      ],
    }));
  }

  function removeLevel(index: number) {
    setFrameworkForm((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }));
  }

  async function handleCreateFramework() {
    if (!frameworkForm.name) {
      toast.error("Framework name is required");
      return;
    }
    try {
      await createFramework.mutateAsync({
        name: frameworkForm.name,
        description: frameworkForm.description || undefined,
        ratingScale: Number(frameworkForm.ratingScale) || 5,
        levels: frameworkForm.levels,
      });
      toast.success("Framework created");
      setFrameworkSheetOpen(false);
      setFrameworkForm({ name: "", description: "", ratingScale: "5", levels: [{ level: 1, label: "", description: "" }] });
    } catch {
      toast.error("Failed to create framework");
    }
  }

  async function handleCreateCompetency(frameworkId: number) {
    if (!competencyForm.name || !competencyForm.category) {
      toast.error("Name and category are required");
      return;
    }
    try {
      await createCompetency.mutateAsync({
        frameworkId,
        name: competencyForm.name,
        category: competencyForm.category,
        description: competencyForm.description || undefined,
        weight: competencyForm.weight || "1",
      });
      toast.success("Competency added");
      setCompetencyDialogFrameworkId(null);
      setCompetencyForm({ name: "", category: "", description: "", weight: "1" });
    } catch {
      toast.error("Failed to add competency");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-2">
            <div className="h-5 w-1/3 bg-slate-200 rounded" />
            <div className="h-4 w-1/4 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={frameworkSheetOpen} onOpenChange={setFrameworkSheetOpen}>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                Add Framework
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="w-[480px] p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Competency Framework</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={frameworkForm.name} onChange={(e) => handleFrameworkFormChange("name", e.target.value)} placeholder="Framework name" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={frameworkForm.description} onChange={(e) => handleFrameworkFormChange("description", e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Rating Scale</Label>
                <Input type="number" min={2} max={10} value={frameworkForm.ratingScale} onChange={(e) => handleFrameworkFormChange("ratingScale", e.target.value)} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Levels</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addLevel}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Level
                  </Button>
                </div>
                {frameworkForm.levels.map((level, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Level {idx + 1}</span>
                      {frameworkForm.levels.length > 1 && (
                        <button onClick={() => removeLevel(idx)} className="text-slate-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Label (e.g. Beginner)"
                      value={level.label}
                      onChange={(e) => handleLevelChange(idx, "label", e.target.value)}
                    />
                    <Input
                      placeholder="Description"
                      value={level.description}
                      onChange={(e) => handleLevelChange(idx, "description", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={handleCreateFramework}
                  disabled={createFramework.isPending}
                >
                  {createFramework.isPending ? "Creating…" : "Create Framework"}
                </Button>
              </motion.div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {frameworks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <BarChart2 className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">No frameworks yet</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {frameworks.map((framework: CompetencyFramework, i: number) => (
            <motion.div
              key={framework.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
            >
              <AccordionItem
                value={String(framework.id)}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 px-5 overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <h3 className="font-semibold text-slate-800">{framework.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-xs bg-violet-100 text-violet-700">
                          {framework.ratingScale}-point scale
                        </Badge>
                        <Badge className="text-xs bg-slate-100 text-slate-600">
                          {framework.levels.length} levels
                        </Badge>
                        <Badge className={`text-xs ${framework.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {framework.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pb-4 space-y-3">
                    {framework.competencies && framework.competencies.length > 0 ? (
                      <div className="space-y-2">
                        {framework.competencies.map((comp) => (
                          <div key={comp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                            <div>
                              <span className="text-sm font-medium text-slate-700">{comp.name}</span>
                              {comp.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{comp.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge className={`text-xs ${getCategoryColor(comp.category)}`}>{comp.category}</Badge>
                              <span className="text-xs text-slate-400">w:{comp.weight}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-2">No competencies yet</p>
                    )}
                    <Dialog
                      open={competencyDialogFrameworkId === framework.id}
                      onOpenChange={(open) => {
                        setCompetencyDialogFrameworkId(open ? framework.id : null);
                        if (!open) setCompetencyForm({ name: "", category: "", description: "", weight: "1" });
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Competency
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Competency to {framework.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <Label>Name *</Label>
                            <Input
                              value={competencyForm.name}
                              onChange={(e) => setCompetencyForm((p) => ({ ...p, name: e.target.value }))}
                              placeholder="Competency name"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Category *</Label>
                            <Input
                              value={competencyForm.category}
                              onChange={(e) => setCompetencyForm((p) => ({ ...p, category: e.target.value }))}
                              placeholder="e.g. Technical, Leadership"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input
                              value={competencyForm.description}
                              onChange={(e) => setCompetencyForm((p) => ({ ...p, description: e.target.value }))}
                              placeholder="Optional description"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Weight</Label>
                            <Input
                              type="number"
                              value={competencyForm.weight}
                              onChange={(e) => setCompetencyForm((p) => ({ ...p, weight: e.target.value }))}
                            />
                          </div>
                          <motion.div whileTap={{ scale: 0.97 }}>
                            <Button
                              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                              onClick={() => handleCreateCompetency(framework.id)}
                              disabled={createCompetency.isPending}
                            >
                              {createCompetency.isPending ? "Adding…" : "Add Competency"}
                            </Button>
                          </motion.div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      )}
    </div>
  );
}

export default function KpisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <h1 className="text-2xl font-bold text-slate-900">KPIs & Competencies</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define performance indicators and competency frameworks</p>
      </motion.div>

      <Tabs defaultValue="kpis">
        <TabsList className="bg-white/80 border border-slate-200/80">
          <TabsTrigger value="kpis">KPI Library</TabsTrigger>
          <TabsTrigger value="frameworks">Competency Frameworks</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="kpis" className="mt-6">
            <KpiLibraryTab />
          </TabsContent>
          <TabsContent value="frameworks" className="mt-6">
            <CompetencyFrameworksTab />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
