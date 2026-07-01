"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, DollarSign, Users, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUpdateLead } from "@/hooks/api/leads";

interface BANTData {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes: string;
}

const BANT_CRITERIA = [
  { key: "budget" as const, label: "Budget", icon: DollarSign, description: "Has confirmed budget" },
  { key: "authority" as const, label: "Authority", icon: Users, description: "Decision maker involved" },
  { key: "need" as const, label: "Need", icon: Target, description: "Clear pain point identified" },
  { key: "timeline" as const, label: "Timeline", icon: Clock, description: "Purchase timeline defined" },
] as const;

interface ScoreConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
}

function getScoreConfig(score: number): ScoreConfig {
  if (score === 4) return { label: "Fully Qualified", badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200", dotColor: "bg-emerald-500" };
  if (score === 3) return { label: "Mostly Qualified", badgeClass: "bg-orange-50 text-orange-700 border border-orange-200", dotColor: "bg-orange-500" };
  if (score === 2) return { label: "Partially Qualified", badgeClass: "bg-amber-50 text-amber-700 border border-amber-200", dotColor: "bg-amber-500" };
  if (score === 1) return { label: "Weakly Qualified", badgeClass: "bg-red-50 text-red-700 border border-red-200", dotColor: "bg-red-500" };
  return { label: "Unqualified", badgeClass: "bg-slate-100 text-slate-500 border border-slate-200", dotColor: "bg-slate-400" };
}

const DEFAULT_BANT: BANTData = { budget: false, authority: false, need: false, timeline: false, notes: "" };

interface LeadQualificationPanelProps {
  leadId: number;
  qualificationJson: string | null;
}

export function LeadQualificationPanel({ leadId, qualificationJson }: LeadQualificationPanelProps) {
  const [bant, setBant] = useState<BANTData>(() => {
    if (!qualificationJson) return DEFAULT_BANT;
    try {
      return { ...DEFAULT_BANT, ...(JSON.parse(qualificationJson) as Partial<BANTData>) };
    } catch {
      return DEFAULT_BANT;
    }
  });
  const [dirty, setDirty] = useState(false);
  const updateLead = useUpdateLead();

  const score = BANT_CRITERIA.filter((c) => bant[c.key]).length;
  const scoreConfig = getScoreConfig(score);

  const handleToggle = useCallback((key: "budget" | "authority" | "need" | "timeline") => {
    setBant((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }, []);

  const handleCriterionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const criterion = BANT_CRITERIA.find(
        (c) => c.key === e.currentTarget.dataset.criterion
      );
      if (criterion) handleToggle(criterion.key);
    },
    [handleToggle]
  );

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBant((prev) => ({ ...prev, notes: e.target.value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateLead.mutateAsync({ id: leadId, qualificationNotes: JSON.stringify(bant) });
      setDirty(false);
      toast.success("Qualification saved");
    } catch {
      toast.error("Failed to save qualification");
    }
  }, [bant, leadId, updateLead]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">
              BANT Qualification
            </CardTitle>
            <Badge className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${scoreConfig.badgeClass}`}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${scoreConfig.dotColor}`} />
              {score}/4 · {scoreConfig.label}
            </Badge>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(score / 4) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-2">
            {BANT_CRITERIA.map((criterion, idx) => {
              const checked = bant[criterion.key];
              return (
                <motion.button
                  key={criterion.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.22, ease: "easeOut" }}
                  whileTap={{ scale: 0.97 }}
                  data-criterion={criterion.key}
                  onClick={handleCriterionClick}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 text-left ${
                    checked
                      ? "bg-violet-50 border-violet-200 hover:bg-violet-100"
                      : "bg-white/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {checked ? (
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                  )}
                  <criterion.icon className={`h-4 w-4 shrink-0 ${checked ? "text-violet-500" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${checked ? "text-violet-700" : "text-slate-600"}`}>
                      {criterion.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{criterion.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
              Qualification Notes
            </label>
            <Textarea
              value={bant.notes}
              onChange={handleNotesChange}
              placeholder="Budget confirmed at ₹X, talking to VP of Sales..."
              className="text-xs min-h-[72px] resize-none"
              rows={3}
            />
          </div>

          {dirty && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="sm"
                onClick={handleSave}
                disabled={updateLead.isPending}
              >
                {updateLead.isPending ? "Saving..." : "Save Qualification"}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
