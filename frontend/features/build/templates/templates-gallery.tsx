"use client";

import { useRef, useCallback, useState } from "react";
import type { ProjectTemplate } from "@/hooks/api/build";
import { TemplateCard } from "./template-card";
import { TemplatesGridSkeleton } from "./build-templates-page";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

const STUB_TEMPLATES: ProjectTemplate[] = [
  {
    id: 1,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Sprint Planning",
    description: "Two-week sprint with backlog grooming, daily standups, review and retrospective.",
    category: "ENGINEERING",
    tickets: [
      { id: 11, templateId: 1, title: "Set sprint goal", description: null, type: "TASK", priority: "HIGH", estimatedHours: null, order: 0, phase: "Setup" },
      { id: 12, templateId: 1, title: "Backlog refinement meeting", description: null, type: "TASK", priority: "NORMAL", estimatedHours: "1", order: 1, phase: "Setup" },
      { id: 13, templateId: 1, title: "Sprint review and demo", description: null, type: "TASK", priority: "NORMAL", estimatedHours: "1", order: 2, phase: "Close" },
    ],
  },
  {
    id: 2,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Bug Bash",
    description: "Focused bug discovery sprint with triaged outcomes and automated regression coverage.",
    category: "QUALITY",
    tickets: [
      { id: 21, templateId: 2, title: "Set up bug reporting board", description: null, type: "TASK", priority: "HIGH", estimatedHours: null, order: 0, phase: null },
      { id: 22, templateId: 2, title: "Prioritise P0/P1 issues", description: null, type: "BUG", priority: "HIGH", estimatedHours: null, order: 1, phase: null },
    ],
  },
  {
    id: 3,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Feature Launch",
    description: "End-to-end feature delivery from discovery to production rollout.",
    category: "PRODUCT",
    tickets: [
      { id: 31, templateId: 3, title: "Write product spec", description: null, type: "STORY", priority: "HIGH", estimatedHours: "4", order: 0, phase: "Discovery" },
      { id: 32, templateId: 3, title: "Technical design review", description: null, type: "TASK", priority: "NORMAL", estimatedHours: "2", order: 1, phase: "Design" },
      { id: 33, templateId: 3, title: "Feature flags and rollout plan", description: null, type: "TASK", priority: "HIGH", estimatedHours: null, order: 2, phase: "Launch" },
    ],
  },
];

const STUB_APPLY = () => undefined;
const STUB_DELETE = () => undefined;

function TemplatesKeyboardGalleryCase() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState<number | null>(null);

  const handleKeyboardOpen = useCallback((index: number) => {
    setFocused(index);
  }, []);

  const handleKeyboardClear = useCallback(() => {
    setFocused(null);
  }, []);

  useBuildListKeyboard({
    itemCount: STUB_TEMPLATES.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: true,
  });

  return (
    <section data-case-frame="templates-grid-keyboard" className="flex min-h-0 flex-col gap-3">
      {focused !== null ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Focused: {STUB_TEMPLATES[focused]?.name ?? ""}
        </p>
      ) : null}
      <div
        role="list"
        aria-label="Project templates"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STUB_TEMPLATES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onApply={STUB_APPLY}
            onDelete={STUB_DELETE}
          />
        ))}
      </div>
    </section>
  );
}

export function TemplatesGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Templates surfaces
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keyboard reachability, responsive layout, and reduced-motion contracts for the templates grid.
          j/k moves focus · Enter opens apply dialog · / focuses search input.
        </p>
      </header>

      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <TemplatesKeyboardGalleryCase />
        </PmSection>
      </PmPageShell>

      <section data-case-frame="templates-loading" className="flex min-h-0 flex-col gap-3">
        <h2 className="text-sm font-medium">Loading — templates grid</h2>
        <TemplatesGridSkeleton />
      </section>
    </div>
  );
}
