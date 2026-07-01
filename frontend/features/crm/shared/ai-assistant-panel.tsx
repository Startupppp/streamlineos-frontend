"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Mail, Clock, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

type AiEntityType = "lead" | "deal" | "contact";

interface AiSuggestion {
  type: "email_draft" | "next_action" | "risk_flag" | "opportunity";
  title: string;
  content: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface AiAssistantPanelProps {
  entityType: AiEntityType;
  entityId: number;
  entityName?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "text-red-500 bg-red-500/10",
  MEDIUM: "text-amber-500 bg-amber-500/10",
  LOW: "text-slate-500 bg-slate-500/10",
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email_draft: Mail,
  next_action: Clock,
  risk_flag: Star,
  opportunity: Sparkles,
};

export function AiAssistantPanel({ entityType, entityId, entityName }: AiAssistantPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await apiClient.post<{ suggestions: AiSuggestion[] }>(
        `/ai/crm/${entityType}/${entityId}/suggestions`,
        {}
      );
      setSuggestions(result.suggestions ?? []);
    } catch {
      toast.error("AI suggestions unavailable. Check your AI credits.");
    } finally {
      setGenerating(false);
    }
  }, [entityType, entityId]);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-200/60 overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-violet-900">AI Sales Assistant</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-violet-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-violet-600 mb-3">
                    Get AI-powered suggestions for {entityName ?? `this ${entityType}`}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generating ? "Generating..." : "Generate Suggestions"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s, i) => {
                    const Icon = TYPE_ICON[s.type] ?? Sparkles;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-violet-100"
                      >
                        <div className="flex items-start gap-2">
                          <Icon className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-semibold text-slate-800">{s.title}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[s.priority] ?? ""}`}>
                                {s.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap">{s.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-7 w-full text-xs text-violet-600 hover:text-violet-700"
                  >
                    {generating ? "Regenerating..." : "Regenerate"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
