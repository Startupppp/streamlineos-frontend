"use client";

import type { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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
import type { RoadmapPrioritization } from "@/hooks/api/build/roadmap";
import type { RoadmapItemFormValues } from "./roadmap-schema";
import { RICE_IMPACT_OPTIONS } from "./roadmap-constants";
import { RoadmapPriorityScore } from "./roadmap-priority-score";

interface RoadmapRiceFormFieldsProps {
  control: Control<RoadmapItemFormValues>;
  prioritization?: RoadmapPrioritization;
}

export function RoadmapRiceFormFields({ control, prioritization }: RoadmapRiceFormFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Prioritization (RICE)</p>
          <p className="text-xs text-muted-foreground">
            Reach × Impact × Confidence ÷ Effort. Leave any field blank to keep this item unscored.
          </p>
        </div>
        <RoadmapPriorityScore prioritization={prioritization} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="reach"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reach</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="e.g. 1200" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="impact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impact</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Unscored" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RICE_IMPACT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="confidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confidence %</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="e.g. 80" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="effort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effort</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="e.g. 4" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
