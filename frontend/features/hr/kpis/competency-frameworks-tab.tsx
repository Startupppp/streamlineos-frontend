"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
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
  useCompetencyFrameworks,
  useCreateCompetencyFramework,
  useCreateCompetency,
  type CompetencyFramework,
} from "@/hooks/api/hr";

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

function RemoveLevelButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      aria-label="Remove level"
      onClick={onClick}
      className="text-muted-foreground hover:text-destructive"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </button>
  );
}

export function CompetencyFrameworksTab() {
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
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse space-y-2">
            <div className="h-5 w-1/3 bg-muted rounded" />
            <div className="h-4 w-1/4 bg-muted rounded" />
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
              <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2">
                Add Framework
              </AnimatedIconButton>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="flex w-[480px] flex-col gap-0 overflow-hidden p-0">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left gap-1">
              <SheetTitle>Create Competency Framework</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-4 px-6 py-5">
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
                  <AnimatedIconButton type="button" icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" variant="outline" onClick={addLevel}>
                    Add Level
                  </AnimatedIconButton>
                </div>
                {frameworkForm.levels.map((level, idx) => (
                  <div key={idx} className="bg-muted rounded-xl p-3 space-y-2 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Level {idx + 1}</span>
                      {frameworkForm.levels.length > 1 && (
                        <RemoveLevelButton onClick={() => removeLevel(idx)} />
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
                <LoadingButton
                  className="w-full"
                  onClick={handleCreateFramework}
                  isPending={createFramework.isPending}
                  loadingText="Creating…"
                >
                  Create Framework
                </LoadingButton>
              </motion.div>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>

      {frameworks.length === 0 ? (
        <ChartEmptyState message="No frameworks yet" height={220} />
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
                className="bg-card rounded-2xl border border-border shadow-sm px-5 overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <h3 className="font-semibold text-foreground">{framework.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-xs bg-status-info-surface text-status-info-ink">
                          {framework.ratingScale}-point scale
                        </Badge>
                        <Badge className="text-xs bg-muted text-muted-foreground">
                          {framework.levels.length} levels
                        </Badge>
                        <Badge className={`text-xs ${framework.isActive ? "bg-status-success-surface text-status-success-ink" : "bg-muted text-muted-foreground"}`}>
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
                          <div key={comp.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5 border border-border">
                            <div>
                              <span className="text-sm font-medium text-foreground">{comp.name}</span>
                              {comp.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{comp.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge className={`text-xs ${getCategoryColor(comp.category)}`}>{comp.category}</Badge>
                              <span className="text-xs text-muted-foreground">w:{comp.weight}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No competencies yet</p>
                    )}
                    <Dialog
                      open={competencyDialogFrameworkId === framework.id}
                      onOpenChange={(open) => {
                        setCompetencyDialogFrameworkId(open ? framework.id : null);
                        if (!open) setCompetencyForm({ name: "", category: "", description: "", weight: "1" });
                      }}
                    >
                      <DialogTrigger asChild>
                        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" variant="outline" className="text-status-info-ink border-status-info-rule hover:bg-status-info-surface">
                          Add Competency
                        </AnimatedIconButton>
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
                            <LoadingButton
                              className="w-full"
                              onClick={() => handleCreateCompetency(framework.id)}
                              isPending={createCompetency.isPending}
                              loadingText="Adding…"
                            >
                              Add Competency
                            </LoadingButton>
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
