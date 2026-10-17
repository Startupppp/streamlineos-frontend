"use client";

import { parseISO, isValid } from "date-fns";
import { useWatch, type Control } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserDisplayName } from "@/lib/person-display";
import { formatShortDate } from "@/lib/date-utils";
import { ROADMAP_STATUS_OPTIONS, ROADMAP_HORIZON_OPTIONS, BUILD_FILTER_NONE } from "./roadmap-constants";
import { RoadmapDeliveryProgress } from "./roadmap-delivery-progress";
import { RoadmapRiceFormFields } from "./roadmap-rice-form-fields";
import { RoadmapDeliveryFields } from "./roadmap-delivery-fields";
import { ROADMAP_TITLE_MAX, type RoadmapItemFormValues } from "./roadmap-schema";
import type { ScorableRoadmapItem } from "./roadmap-item-card";
import { useGoals } from "@/hooks/api/goals";

function parseTargetDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function snapshotNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function snapshotText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function DecisionSnapshotSummary({ snapshot }: { snapshot: Record<string, unknown> }) {
  const decidedAt = snapshotText(snapshot.decidedAt);
  const score = snapshotNumber(snapshot.score);
  const scoreVersion = snapshotNumber(snapshot.scoreVersion);
  const evidenceCount = snapshotNumber(snapshot.evidenceCount);
  const note = snapshotText(snapshot.note);

  return (
    <div
      className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5"
      data-testid="roadmap-decision-snapshot"
    >
      <p className="text-xs font-medium text-foreground">
        Decision snapshot
        {decidedAt ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            · accepted {formatShortDate(decidedAt)}
          </span>
        ) : null}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Score</dt>
        <dd className="font-mono tabular-nums text-foreground">
          {score === null ? "Unscored" : score.toFixed(2)}
          {scoreVersion === null ? null : (
            <span className="ml-1.5 font-sans text-muted-foreground">v{scoreVersion}</span>
          )}
        </dd>
        {evidenceCount === null ? null : (
          <>
            <dt className="text-muted-foreground">Evidence</dt>
            <dd className="text-foreground">
              {evidenceCount} {evidenceCount === 1 ? "piece" : "pieces"}
            </dd>
          </>
        )}
        {note ? (
          <>
            <dt className="text-muted-foreground">Note</dt>
            <dd className="text-foreground whitespace-pre-wrap break-words">{note}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

interface RoadmapItemFormFieldsProps {
  control: Control<RoadmapItemFormValues>;
  isEdit: boolean;
  item?: ScorableRoadmapItem;
  managedProductId?: number;
}

export function RoadmapItemFormFields({
  control,
  isEdit,
  item,
  managedProductId,
}: RoadmapItemFormFieldsProps) {
  const { data: goals } = useGoals();
  const targetStart = useWatch({ control, name: "targetStart" });
  const earliestEnd = parseTargetDate(targetStart);

  const decisionSnapshot = item?.decisionSnapshot;

  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Title <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Dark mode support" />
            </FormControl>
            <FormDescription className="text-xs tabular-nums">
              {field.value.length}/{ROADMAP_TITLE_MAX}
            </FormDescription>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="outcome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Outcome</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} placeholder="What success looks like when this ships" />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      {isEdit && item?.owner ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Owner</p>
          <p className="text-sm font-medium text-foreground">{getUserDisplayName(item.owner)}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="horizon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horizon</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROADMAP_HORIZON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROADMAP_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="isPublic"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Public</p>
                <p className="text-xs text-muted-foreground">Show this item on the public board</p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border border-border data-[state=unchecked]:bg-input"
                />
              </FormControl>
            </div>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="targetStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Start</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel="Target Start"
                  placeholder="Pick a date"
                  dateFormat="dd MMM yyyy"
                  clearable
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="targetEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target End</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel="Target End"
                  placeholder="Pick a date"
                  dateFormat="dd MMM yyyy"
                  fromDate={earliestEnd}
                  clearable
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      {goals && goals.length > 0 ? (
        <FormField
          control={control}
          name="goalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal</FormLabel>
              <Select
                value={field.value || BUILD_FILTER_NONE}
                onValueChange={(v) => field.onChange(v === BUILD_FILTER_NONE ? "" : v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BUILD_FILTER_NONE}>No goal</SelectItem>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      ) : null}
      <RoadmapDeliveryFields
        control={control}
        managedProductId={managedProductId}
        linkedProjectId={item?.projectId ?? null}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="targetQuarter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Quarter</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Q3 2026" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Integrations" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <RoadmapRiceFormFields
        control={control}
        prioritization={item?.prioritization}
        tierWeighting={item?.tierWeighting}
      />
      {isEdit && item ? <RoadmapDeliveryProgress roadmapItemId={item.id} /> : null}
      {decisionSnapshot ? <DecisionSnapshotSummary snapshot={decisionSnapshot} /> : null}
    </>
  );
}
