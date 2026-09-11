import { useCallback } from "react";
import { Pencil } from "lucide-react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { type SupportRoutingRule } from "@/hooks/api/support/macros";
import {
  ASSIGNMENT_MODES,
  ROUTING_FIELDS,
  ROUTING_OPERATORS,
} from "./routing-rule-options";
import { conditionSchema } from "./routing-rule-form.schema";

interface RoutingRuleCardProps {
  rule: SupportRoutingRule;
  index: number;
  total: number;
  assigneeName: string | null;
  onToggle: (rule: SupportRoutingRule) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (rule: SupportRoutingRule) => void;
  onDelete: (rule: SupportRoutingRule) => void;
}

export function RoutingRuleCard({
  rule,
  index,
  total,
  assigneeName,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: RoutingRuleCardProps) {
  const handleToggle = useCallback(() => onToggle(rule), [onToggle, rule]);
  const handleMoveUp = useCallback(() => onMove(index, "up"), [index, onMove]);
  const handleMoveDown = useCallback(
    () => onMove(index, "down"),
    [index, onMove],
  );
  const handleEdit = useCallback(() => onEdit(rule), [onEdit, rule]);
  const handleDelete = useCallback(() => onDelete(rule), [onDelete, rule]);
  return (
    <Card className={rule.isEnabled ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={index === 0}
              onClick={handleMoveUp}
              aria-label="Move rule up"
              icon={ChevronUpIcon}
              iconSize={12}
            />
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={index === total - 1}
              onClick={handleMoveDown}
              aria-label="Move rule down"
              icon={ChevronDownIcon}
              iconSize={12}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium truncate">{rule.name}</h3>
              {rule.setPriority && (
                <Badge variant="secondary" className="text-micro">
                  → {rule.setPriority}
                </Badge>
              )}
              {rule.assignmentMode === "static" && assigneeName && (
                <Badge variant="outline" className="text-micro">
                  → {assigneeName}
                </Badge>
              )}
              {rule.assignmentMode !== "static" && (
                <Badge variant="outline" className="text-micro">
                  {ASSIGNMENT_MODES.find(
                    (mode) => mode.value === rule.assignmentMode,
                  )?.label ?? rule.assignmentMode}
                  {" · "}
                  {rule.candidateAgentIds.length} agent
                  {rule.candidateAgentIds.length === 1 ? "" : "s"}
                </Badge>
              )}
              {rule.requiredSkills.length > 0 && (
                <Badge variant="outline" className="text-micro">
                  Skills: {rule.requiredSkills.join(", ")}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {rule.conditions.map((rawCondition, conditionIndex) => {
                const parsed = conditionSchema.safeParse(rawCondition);
                if (!parsed.success) return null;
                const condition = parsed.data;
                return (
                  <Badge
                    key={conditionIndex}
                    variant="outline"
                    className="text-micro"
                  >
                    {ROUTING_FIELDS.find(
                      (field) => field.value === condition.field,
                    )?.label ?? condition.field}{" "}
                    {ROUTING_OPERATORS.find(
                      (operator) => operator.value === condition.op,
                    )?.label ?? condition.op}{" "}
                    {condition.value}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isEnabled} onCheckedChange={handleToggle} />
            <Button
              variant="ghost"
              size="icon"
              className="w-7"
              onClick={handleEdit}
              aria-label="Edit rule"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              className="w-7 text-destructive"
              onClick={handleDelete}
              aria-label="Delete rule"
              icon={Trash2Icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
