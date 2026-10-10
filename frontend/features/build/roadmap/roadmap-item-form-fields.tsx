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
import { ROADMAP_STATUS_OPTIONS, ROADMAP_HORIZON_OPTIONS } from "./roadmap-constants";
import { RoadmapDeliveryProgress } from "./roadmap-delivery-progress";
import { RoadmapRiceFormFields } from "./roadmap-rice-form-fields";
import { RoadmapDeliveryProjectField } from "./roadmap-delivery-project-field";
import type { RoadmapItemFormValues } from "./roadmap-schema";
import type { ScorableRoadmapItem } from "./roadmap-item-card";
import { useGoals } from "@/hooks/api/goals";
import { useManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import { useProjectTeams } from "@/hooks/api/build/teams";

const BUILD_FILTER_NONE = "";

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
  const { data: releasesPage } = useManagedProductReleases(managedProductId ?? 0, {
    enabled: managedProductId !== undefined && managedProductId > 0,
  });
  const { data: teamsPage } = useProjectTeams();

  const releaseOptions = releasesPage?.data ?? [];
  const teamOptions = teamsPage?.data ?? [];

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
              <Textarea
                {...field}
                rows={2}
                placeholder="What success looks like when this ships"
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      {isEdit && item?.owner ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Owner</p>
          <p className="text-sm font-medium text-foreground">
            {getUserDisplayName(item.owner)}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="horizon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horizon</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
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
              <Select value={field.value} onValueChange={field.onChange}>
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
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="targetStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Start</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
                <Input type="date" {...field} />
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
              <Select value={field.value || BUILD_FILTER_NONE} onValueChange={field.onChange}>
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
      {releaseOptions.length > 0 ? (
        <FormField
          control={control}
          name="releaseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Release</FormLabel>
              <Select value={field.value || BUILD_FILTER_NONE} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No release" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BUILD_FILTER_NONE}>No release</SelectItem>
                  {releaseOptions.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} {r.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      ) : null}
      {teamOptions.length > 0 ? (
        <FormField
          control={control}
          name="teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select value={field.value || BUILD_FILTER_NONE} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BUILD_FILTER_NONE}>No team</SelectItem>
                  {teamOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      ) : null}
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
      <RoadmapDeliveryProjectField
        control={control}
        managedProductId={managedProductId}
        linkedProjectId={item?.projectId ?? null}
      />
      <RoadmapRiceFormFields
        control={control}
        prioritization={item?.prioritization}
        tierWeighting={item?.tierWeighting}
      />
      {isEdit && item ? (
        <RoadmapDeliveryProgress roadmapItemId={item.id} />
      ) : null}
      {decisionSnapshot ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1">
          <p className="text-xs font-medium text-foreground">Decision snapshot</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {JSON.stringify(decisionSnapshot, null, 2)}
          </pre>
        </div>
      ) : null}
      <FormField
        control={control}
        name="isPublic"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Public</p>
                <p className="text-xs text-muted-foreground">
                  Show this item on the public board
                </p>
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
    </>
  );
}
