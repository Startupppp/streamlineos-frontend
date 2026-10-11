"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useGoals } from "@/hooks/api/goals";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { useManagedProductProjects } from "@/hooks/api/build/managed-product-projects";
import { useManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import type { AcceptOpportunityInput } from "@/hooks/api/build/opportunity-mutations";
import { acceptSchema, type AcceptFormValues } from "./opportunity-accept-schema";
import {
  AcceptFields,
  type NamedItem,
  type Release,
  type TitledItem,
} from "./opportunity-accept-fields";

interface OpportunityAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityTitle: string;
  expectedVersion: number;
  managedProductId: number;
  isSubmitting: boolean;
  onAccept: (data: AcceptOpportunityInput) => void;
}

export function OpportunityAcceptDialog({
  open,
  onOpenChange,
  opportunityTitle,
  expectedVersion,
  managedProductId,
  isSubmitting,
  onAccept,
}: OpportunityAcceptDialogProps) {
  const { data: goalsRaw } = useGoals({ managedProductId });
  const goals = useMemo<TitledItem[]>(() => goalsRaw ?? [], [goalsRaw]);
  const { data: roadmapPage } = useRoadmapItems({ managedProductId });
  const roadmapItems = useMemo<TitledItem[]>(() => roadmapPage?.data ?? [], [roadmapPage]);
  const { data: projectsPage } = useManagedProductProjects({ managedProductId, limit: 100 });
  const projects = useMemo<NamedItem[]>(() => projectsPage?.data ?? [], [projectsPage]);
  const { data: releasesPage } = useManagedProductReleases(managedProductId, { enabled: open });
  const releases = useMemo<Release[]>(() => releasesPage?.data ?? [], [releasesPage]);

  return (
    <EntityFormSheet<AcceptFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Accept opportunity"
      description={`Accepting "${opportunityTitle}" will create a linked roadmap initiative.`}
      resolver={zodResolver(acceptSchema)}
      defaultValues={{ horizon: "next", expectedVersion, isPublic: false }}
      onSubmit={onAccept}
      isSubmitting={isSubmitting}
      submitLabel="Accept"
      resetOnOpen
    >
      {(form) => (
        <AcceptFields
          form={form}
          projects={projects}
          releases={releases}
          goals={goals}
          roadmapItems={roadmapItems}
        />
      )}
    </EntityFormSheet>
  );
}
