"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { PlusCircle } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewSection, ReviewQuestion } from "@/types/hr/templates";

const QUESTION_TYPES = [
  { value: "rating", label: "Rating (1–5)" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Yes/No" },
] as const;

interface ReviewEditorProps {
  sections: ReviewSection[];
  onChange: (sections: ReviewSection[]) => void;
}

export function ReviewEditor({ sections, onChange }: ReviewEditorProps) {
  const handleAddSection = useCallback(() => {
    onChange([...sections, { id: nanoid(8), title: "", questions: [] }]);
  }, [sections, onChange]);

  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      onChange(sections.filter((s) => s.id !== sectionId));
    },
    [sections, onChange],
  );

  const handleSectionTitle = useCallback(
    (sectionId: string, title: string) => {
      onChange(sections.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    },
    [sections, onChange],
  );

  const handleAddQuestion = useCallback(
    (sectionId: string) => {
      onChange(
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, questions: [...s.questions, { id: nanoid(8), text: "", type: "text" as const, required: true }] }
            : s,
        ),
      );
    },
    [sections, onChange],
  );

  const handleChangeQuestion = useCallback(
    (sectionId: string, questionId: string, patch: Partial<ReviewQuestion>) => {
      onChange(
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
            : s,
        ),
      );
    },
    [sections, onChange],
  );

  const handleRemoveQuestion = useCallback(
    (sectionId: string, questionId: string) => {
      onChange(
        sections.map((s) =>
          s.id === sectionId ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) } : s,
        ),
      );
    },
    [sections, onChange],
  );

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
            <Input
              placeholder="Section title"
              value={section.title}
              onChange={(e) => handleSectionTitle(section.id, e.target.value)}
              className="flex-1 text-sm font-medium"
            />
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveSection(section.id)}
            />
          </div>
          <div className="p-3 space-y-2">
            {section.questions.map((q) => (
              <div key={q.id} className="flex items-center gap-2">
                <Input
                  placeholder="Question"
                  value={q.text}
                  onChange={(e) => handleChangeQuestion(section.id, q.id, { text: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={q.type}
                  onValueChange={(v) => handleChangeQuestion(section.id, q.id, { type: v as ReviewQuestion["type"] })}
                >
                  <SelectTrigger className="w-32 shrink-0">
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
                    onCheckedChange={(v) => handleChangeQuestion(section.id, q.id, { required: v })}
                    className="scale-75"
                  />
                  <span className="text-[10px] text-muted-foreground">Req</span>
                </div>
                <AnimatedIconButton
                  icon={Trash2Icon}
                  iconSize={14}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveQuestion(section.id, q.id)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => handleAddQuestion(section.id)}
            >
              <PlusCircle className="h-3 w-3" />
              Add Question
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAddSection}>
        <PlusCircle className="h-3.5 w-3.5" />
        Add Section
      </Button>
    </div>
  );
}
