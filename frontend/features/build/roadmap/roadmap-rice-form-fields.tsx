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
import type { RoadmapPrioritization, RoadmapTierWeighting } from "@/hooks/api/build/roadmap";
import type { RoadmapItemFormValues } from "./roadmap-schema";
import { RICE_IMPACT_OPTIONS, ROADMAP_TIER_UNWEIGHTED_LABEL } from "./roadmap-constants";
import { RoadmapPriorityScore } from "./roadmap-priority-score";

interface RoadmapRiceFormFieldsProps {
  control: Control<RoadmapItemFormValues>;
  prioritization?: RoadmapPrioritization;
  tierWeighting?: RoadmapTierWeighting;
}

export function RoadmapRiceFormFields({
  control,
  prioritization,
  tierWeighting,
}: RoadmapRiceFormFieldsProps) {
  const unweightedReason = tierWeighting?.unweightedReason ?? null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Prioritization (RICE)</p>
          <p className="text-xs text-muted-foreground">
            Reach × Impact × Confidence ÷ Effort. Leave any field blank to keep this item unscored.
          </p>
        </div>
        <RoadmapPriorityScore prioritization={prioritization} tierWeighting={tierWeighting} />
      </div>
      {unweightedReason === null ? null : (
        <p className="text-xs text-muted-foreground">
          {ROADMAP_TIER_UNWEIGHTED_LABEL[unweightedReason]}
        </p>
      )}
      {tierWeighting?.tierWeighted === true ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          Weighted ×{tierWeighting.weight} by the highest tier across{" "}
          {tierWeighting.linkedAccountCount} linked account
          {tierWeighting.linkedAccountCount === 1 ? "" : "s"}.
        </p>
      ) : null}
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
