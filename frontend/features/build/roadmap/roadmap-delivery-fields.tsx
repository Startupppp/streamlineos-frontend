"use client";

import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useEpics } from "@/hooks/api/build/epics";
import { RoadmapDeliveryProjectField } from "./roadmap-delivery-project-field";
import type { RoadmapItemFormValues } from "./roadmap-schema";

const BUILD_FILTER_NONE = "";

interface RoadmapDeliveryFieldsProps {
  control: Control<RoadmapItemFormValues>;
  managedProductId?: number;
  linkedProjectId: number | null;
}

export function RoadmapDeliveryFields({
  control,
  managedProductId,
  linkedProjectId,
}: RoadmapDeliveryFieldsProps) {
  const { data: releasesPage } = useManagedProductReleases(managedProductId ?? 0, {
    enabled: managedProductId !== undefined && managedProductId > 0,
  });
  const { data: teamsPage } = useProjectTeams();
  const watchedProjectId = useWatch({ control, name: "projectId" });
  const epicProjectId = watchedProjectId ? Number(watchedProjectId) : 0;
  const { data: epics } = useEpics(epicProjectId);

  const releaseOptions = releasesPage?.data ?? [];
  const teamOptions = teamsPage?.data ?? [];
  const epicOptions = epics ?? [];

  return (
    <>
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
      <RoadmapDeliveryProjectField
        control={control}
        managedProductId={managedProductId}
        linkedProjectId={linkedProjectId}
      />
      {epicProjectId > 0 && epicOptions.length > 0 ? (
        <FormField
          control={control}
          name="epicTicketId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Epic</FormLabel>
              <Select value={field.value || BUILD_FILTER_NONE} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No epic" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BUILD_FILTER_NONE}>No epic</SelectItem>
                  {epicOptions.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}
