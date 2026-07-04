import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChoiceInput } from "@/hooks/api/surveys/builder";

interface ChoicesEditorProps {
  choices: ChoiceInput[];
  onChange: (choices: ChoiceInput[]) => void;
  showCorrectAnswer?: boolean;
  showScore?: boolean;
}

function makeChoiceKey(index: number): string {
  return `choice_${index}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ChoicesEditor({ choices, onChange, showCorrectAnswer, showScore }: ChoicesEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([...choices, { choiceKey: makeChoiceKey(choices.length), label: "" }]);
  }, [choices, onChange]);

  const handleLabelChange = useCallback(
    (index: number, label: string) => {
      onChange(choices.map((c, i) => (i === index ? { ...c, label } : c)));
    },
    [choices, onChange],
  );

  const handleCorrectToggle = useCallback(
    (index: number, isCorrect: boolean) => {
      onChange(choices.map((c, i) => (i === index ? { ...c, isCorrect } : c)));
    },
    [choices, onChange],
  );

  const handleScoreChange = useCallback(
    (index: number, score: number) => {
      onChange(choices.map((c, i) => (i === index ? { ...c, score } : c)));
    },
    [choices, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(choices.filter((_, i) => i !== index));
    },
    [choices, onChange],
  );

  return (
    <div className="space-y-2">
      {choices.map((choice, index) => (
        <div key={choice.choiceKey} className="flex items-center gap-2">
          {showCorrectAnswer && (
            <Checkbox
              checked={choice.isCorrect ?? false}
              onCheckedChange={(checked) => handleCorrectToggle(index, checked === true)}
              aria-label="Correct answer"
            />
          )}
          <Input
            value={choice.label}
            onChange={(e) => handleLabelChange(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            className="h-8"
          />
          {showScore && (
            <Input
              type="number"
              value={choice.score ?? ""}
              onChange={(e) => handleScoreChange(index, e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder="Score"
              className="h-8 w-20"
            />
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemove(index)}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" /> Add option
      </Button>
    </div>
  );
}
