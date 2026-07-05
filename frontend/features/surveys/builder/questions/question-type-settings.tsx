import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";

interface QuestionTypeSettingsProps {
  type: SurveyQuestionType;
  settings: Record<string, unknown>;
  onChange: (settings: Record<string, unknown>) => void;
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value: unknown; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={typeof value === "number" ? value : ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="w-28"
      />
    </div>
  );
}

export function QuestionTypeSettings({ type, settings, onChange }: QuestionTypeSettingsProps) {
  const rows = Array.isArray(settings.rows) ? (settings.rows as string[]) : [];

  const handleAddRow = useCallback(() => {
    onChange({ ...settings, rows: [...rows, ""] });
  }, [settings, rows, onChange]);

  const handleRowChange = useCallback(
    (index: number, label: string) => {
      onChange({ ...settings, rows: rows.map((r, i) => (i === index ? label : r)) });
    },
    [settings, rows, onChange],
  );

  const handleRemoveRow = useCallback(
    (index: number) => {
      onChange({ ...settings, rows: rows.filter((_, i) => i !== index) });
    },
    [settings, rows, onChange],
  );

  if (type === "rating" || type === "star_rating") {
    return <NumberField label="Scale max" value={settings.max} onChange={(n) => onChange({ ...settings, max: n })} placeholder="5" />;
  }

  if (type === "slider") {
    return (
      <div className="flex gap-3">
        <NumberField label="Min" value={settings.min} onChange={(n) => onChange({ ...settings, min: n })} placeholder="0" />
        <NumberField label="Max" value={settings.max} onChange={(n) => onChange({ ...settings, max: n })} placeholder="100" />
        <NumberField label="Step" value={settings.step} onChange={(n) => onChange({ ...settings, step: n })} placeholder="1" />
      </div>
    );
  }

  if (type === "matrix") {
    return (
      <div className="space-y-1.5">
        <Label>Rows</Label>
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input value={row} onChange={(e) => handleRowChange(index, e.target.value)} placeholder={`Row ${index + 1}`} className="h-8" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveRow(index)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
      </div>
    );
  }

  return null;
}
