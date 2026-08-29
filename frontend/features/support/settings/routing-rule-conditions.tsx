import {
  useCallback,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Trash2Icon } from "@animateicons/react/lucide";
import { type RuleForm } from "./routing-rule-form.schema";
import { ROUTING_FIELDS, ROUTING_OPERATORS } from "./routing-rule-options";

interface ConditionRowProps {
  index: number;
  control: Control<RuleForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

export function ConditionRow({
  index,
  control,
  showRemove,
  onRemove,
}: ConditionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  const selectedField = useWatch({
    control,
    name: `conditions.${index}.field`,
  });
  const isVipCondition = selectedField === "isVip";
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border/60 p-2 sm:border-0 sm:p-0">
      <FormField
        control={control}
        name={`conditions.${index}.field`}
        render={({ field }) => (
          <FormItem className="w-[calc(50%-0.25rem)] sm:w-32">
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ROUTING_FIELDS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${index}.op`}
        render={({ field }) => (
          <FormItem className="w-[calc(50%-0.25rem)] sm:w-32">
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Op" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ROUTING_OPERATORS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1 min-w-[140px]">
            <FormControl>
              {isVipCondition ? (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">VIP</SelectItem>
                    <SelectItem value="false">Not VIP</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input {...field} className="text-xs" placeholder="Value" />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showRemove && (
        <AnimatedIconButton
          type="button"
          variant="ghost"
          size="icon"
          className="w-8 text-destructive shrink-0"
          onClick={handleRemove}
          aria-label="Remove condition"
          icon={Trash2Icon}
        />
      )}
    </div>
  );
}

interface CandidateCheckboxProps {
  userId: string;
  label: string;
  checked: boolean;
  onToggle: (userId: string, checked: boolean) => void;
}

export function CandidateCheckbox({
  userId,
  label,
  checked,
  onToggle,
}: CandidateCheckboxProps) {
  const handleCheckedChange = useCallback(
    (value: boolean | "indeterminate") => onToggle(userId, value === true),
    [userId, onToggle],
  );
  return (
    <label
      htmlFor={`candidate-${userId}`}
      className="flex items-center gap-2 text-sm cursor-pointer"
    >
      <Checkbox
        id={`candidate-${userId}`}
        checked={checked}
        onCheckedChange={handleCheckedChange}
      />
      {label}
    </label>
  );
}

interface RequiredSkillsProps {
  form: UseFormReturn<RuleForm>;
}

export function RequiredSkills({ form }: RequiredSkillsProps) {
  const requiredSkills = useWatch({
    control: form.control,
    name: "requiredSkills",
  });
  const [skillDraft, setSkillDraft] = useState("");
  const handleAddSkill = useCallback(() => {
    const value = skillDraft.trim();
    if (!value) return;
    const current = form.getValues("requiredSkills");
    if (!current.includes(value))
      form.setValue("requiredSkills", [...current, value], {
        shouldDirty: true,
      });
    setSkillDraft("");
  }, [form, skillDraft]);
  const handleRemoveSkill = useCallback(
    (skill: string) => {
      form.setValue(
        "requiredSkills",
        form.getValues("requiredSkills").filter((value) => value !== skill),
        { shouldDirty: true },
      );
    },
    [form],
  );
  const handleSkillDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSkillDraft(event.target.value),
    [],
  );
  const handleSkillKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddSkill();
      }
    },
    [handleAddSkill],
  );
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={skillDraft}
          onChange={handleSkillDraftChange}
          onKeyDown={handleSkillKeyDown}
          placeholder="e.g. billing"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSkill}
        >
          Add
        </Button>
      </div>
      {requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {requiredSkills.map((skill) => (
            <SkillBadge
              key={skill}
              skill={skill}
              onRemove={handleRemoveSkill}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillBadge({
  skill,
  onRemove,
}: {
  skill: string;
  onRemove: (skill: string) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleRemove = useCallback(() => onRemove(skill), [onRemove, skill]);
  return (
    <Badge variant="secondary" className="text-micro gap-1">
      {skill}
      <button
        type="button"
        aria-label={`Remove ${skill}`}
        onClick={handleRemove}
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} size={10} />
      </button>
    </Badge>
  );
}
