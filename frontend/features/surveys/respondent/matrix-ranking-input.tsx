import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./answer-value";

export function MatrixInput({ question, value, onChange }: QuestionInputProps) {
  const rows = Array.isArray(question.settings.rows) ? (question.settings.rows as string[]) : [];
  const answers = (value?.answerValue as Record<string, number> | undefined) ?? {};

  function selectCell(rowIndex: number, choiceId: number) {
    onChange({ answerValue: { ...answers, [rowIndex]: choiceId } });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left" />
            {question.choices.map((choice) => (
              <th key={choice.id} className="p-2 text-center font-medium text-muted-foreground">{choice.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row} className="border-t border-border">
              <td className="p-2 font-medium">{row}</td>
              {question.choices.map((choice) => (
                <td key={choice.id} className="p-2 text-center">
                  <RadioGroup value={answers[rowIndex] ? String(answers[rowIndex]) : undefined}>
                    <RadioGroupItem
                      value={String(choice.id)}
                      onClick={() => selectCell(rowIndex, choice.id)}
                      className="mx-auto"
                    />
                  </RadioGroup>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingInput({ question, value, onChange }: QuestionInputProps) {
  const order = value?.choiceIds?.length ? value.choiceIds : question.choices.map((c) => c.id);
  const itemsById = new Map(question.choices.map((c) => [c.id, c]));

  function move(index: number, direction: -1 | 1) {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= order.length) return;
    const next = [...order];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    onChange({ choiceIds: next });
  }

  return (
    <div className="space-y-1.5">
      {order.map((choiceId, index) => {
        const choice = itemsById.get(choiceId);
        if (!choice) return null;
        return (
          <div key={choiceId} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span className={cn("flex-1 text-sm")}>{index + 1}. {choice.label}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Move choice up" disabled={index === 0} onClick={() => move(index, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Move choice down" disabled={index === order.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
