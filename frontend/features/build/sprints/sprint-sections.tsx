"use client";

import { PmSection, PmStaggerList } from "@/components/pm-chrome/pm-chrome";
import { SprintCard } from "@/features/build/sprints/sprint-card";
import { VelocityChart } from "@/features/build/sprints/velocity-chart";
import type { Sprint } from "@/types/projects";

interface SprintSectionsProps {
  projectId: number;
  activeSprints: Sprint[];
  plannedSprints: Sprint[];
  completedSprints: Sprint[];
  isUpdating: boolean;
  onStart: (sprintId: number) => void;
  onComplete: (sprintId: number) => void;
  onPlan: (sprintId: number) => void;
}

export function SprintSections({
  projectId,
  activeSprints,
  plannedSprints,
  completedSprints,
  isUpdating,
  onStart,
  onComplete,
  onPlan,
}: SprintSectionsProps) {
  return (
    <div className="space-y-5">
      {activeSprints.length > 0 ? (
        <PmSection index={0}>
          <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </p>
          <PmStaggerList className="grid gap-2.5">
            {activeSprints.map((sprint) => (
              <div key={sprint.id} className="space-y-2.5">
                <SprintCard
                  sprint={sprint}
                  projectId={projectId}
                  onComplete={onComplete}
                  onPlan={onPlan}
                  isUpdating={isUpdating}
                />
              </div>
            ))}
          </PmStaggerList>
        </PmSection>
      ) : null}

      {activeSprints.length > 0 && plannedSprints.length > 0 ? (
        <div className="border-t border-border/50" />
      ) : null}

      {plannedSprints.length > 0 ? (
        <PmSection index={1}>
          <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Planned
          </p>
          <PmStaggerList className="grid gap-2.5">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onStart={onStart}
                onPlan={onPlan}
                isUpdating={isUpdating}
              />
            ))}
          </PmStaggerList>
        </PmSection>
      ) : null}

      {completedSprints.length > 0 ? (
        <>
          <div className="border-t border-border/50" />
          <PmSection index={2}>
            <VelocityChart sprints={completedSprints} />
          </PmSection>
          <PmSection index={3}>
            <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </p>
            <PmStaggerList className="grid gap-2.5">
              {completedSprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  projectId={projectId}
                  isUpdating={isUpdating}
                />
              ))}
            </PmStaggerList>
          </PmSection>
        </>
      ) : null}
    </div>
  );
}
