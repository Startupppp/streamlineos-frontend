"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SurveyQuestion } from "@/types/hr/templates";

const QUESTION_TYPES = [
  { value: "rating", label: "Rating (1–5)" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Yes/No" },
  { value: "multiple_choice", label: "Multiple Choice" },
] as const;

interface SurveyEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

export function SurveyEditor({ questions, onChange }: SurveyEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...questions,
      { id: nanoid(8), text: "", type: "text", required: true, order: questions.length },
    ]);
  }, [questions, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })));
    },
    [questions, onChange],
  );

  const handleChange = useCallback(
    (id: string, patch: Partial<SurveyQuestion>) => {
      onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    },
    [questions, onChange],
  );

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => (
        <div key={q.id} className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
            <Input
              placeholder="Question text"
              value={q.text}
              onChange={(e) => handleChange(q.id, { text: e.target.value })}
              className="h-8 flex-1"
            />
            <Select
              value={q.type}
              onValueChange={(v) => handleChange(q.id, { type: v as SurveyQuestion["type"] })}
            >
              <SelectTrigger className="h-8 w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={q.required}
                onCheckedChange={(v) => handleChange(q.id, { required: v })}
                className="scale-75"
              />
              <span className="text-[11px] text-muted-foreground">Req</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(q.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {q.type === "multiple_choice" && (
            <div className="pl-7">
              <Input
                placeholder="Options (comma-separated)"
                value={q.options?.join(", ") ?? ""}
                onChange={(e) =>
                  handleChange(q.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAdd}>
        <PlusCircle className="h-3.5 w-3.5" />
        Add Question
      </Button>
    </div>
  );
}
