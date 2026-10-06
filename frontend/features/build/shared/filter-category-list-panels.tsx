"use client";

import type { KeyboardEvent, RefObject } from "react";
import { getUserDisplayName } from "@/lib/person-display";
import {
  FilterAssigneeLeading,
  FilterLabelDot,
} from "./filter-option-leading";
import {
  OptionRow,
  FilterMenuSearch,
  PanelShell,
  EmptyHint,
  type Member,
  type Label,
  type ProjectOption,
} from "@/components/list-view";

interface AssigneePanelProps {
  members: Member[];
  selectedAssignees: string[];
  onToggleAssignee: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  q: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (e: KeyboardEvent) => void;
  showTitle: boolean;
  className?: string;
  listClassName: string;
}

export function AssigneePanel({
  members,
  selectedAssignees,
  onToggleAssignee,
  search,
  onSearchChange,
  q,
  containerRef,
  onKeyDown,
  showTitle,
  className,
  listClassName,
}: AssigneePanelProps) {
  const allMembers: { id: string; displayName: string; member: Member | null }[] = [
    { id: "@me", displayName: "Me (dynamic)", member: null },
    { id: "__unassigned__", displayName: "Unassigned", member: null },
    ...members.map((m) => ({ id: m.id, displayName: getUserDisplayName(m), member: m })),
  ];
  const filtered = allMembers.filter(
    (m) => !q || m.displayName.toLowerCase().includes(q),
  );
  return (
    <PanelShell
      category="assignee"
      containerRef={containerRef}
      onKeyDown={onKeyDown}
      withSearch
      showTitle={showTitle}
      className={className}
    >
      <FilterMenuSearch
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search assignees…"
      />
      <div className={listClassName}>
        {filtered.map((m) => {
          function handleClick() {
            onToggleAssignee(m.id);
          }
          return (
            <OptionRow
              key={m.id}
              active={selectedAssignees.includes(m.id)}
              label={m.displayName}
              leading={<FilterAssigneeLeading assigneeId={m.id} member={m.member} />}
              onClick={handleClick}
            />
          );
        })}
        {filtered.length === 0 ? <EmptyHint message="No members" /> : null}
      </div>
    </PanelShell>
  );
}

interface LabelPanelProps {
  labels: Label[];
  selectedLabels: string[];
  onToggleLabel: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  q: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (e: KeyboardEvent) => void;
  showTitle: boolean;
  className?: string;
  listClassName: string;
}

export function LabelPanel({
  labels,
  selectedLabels,
  onToggleLabel,
  search,
  onSearchChange,
  q,
  containerRef,
  onKeyDown,
  showTitle,
  className,
  listClassName,
}: LabelPanelProps) {
  const filtered = labels.filter(
    (l) => !q || l.name.toLowerCase().includes(q),
  );
  return (
    <PanelShell
      category="label"
      containerRef={containerRef}
      onKeyDown={onKeyDown}
      withSearch
      showTitle={showTitle}
      className={className}
    >
      <FilterMenuSearch
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search labels…"
      />
      <div className={listClassName}>
        {filtered.map((l) => {
          const labelId = String(l.id);
          function handleClick() {
            onToggleLabel(labelId);
          }
          return (
            <OptionRow
              key={l.id}
              active={selectedLabels.includes(labelId)}
              label={l.name}
              leading={<FilterLabelDot color={l.color} />}
              onClick={handleClick}
            />
          );
        })}
        {filtered.length === 0 ? <EmptyHint message="No labels" /> : null}
      </div>
    </PanelShell>
  );
}

interface ProjectPanelProps {
  projectOptions: ProjectOption[];
  selectedProjectIds: string[];
  onToggleProject: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  q: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (e: KeyboardEvent) => void;
  showTitle: boolean;
  className?: string;
  listClassName: string;
}

export function ProjectPanel({
  projectOptions,
  selectedProjectIds,
  onToggleProject,
  search,
  onSearchChange,
  q,
  containerRef,
  onKeyDown,
  showTitle,
  className,
  listClassName,
}: ProjectPanelProps) {
  const filtered = projectOptions.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q),
  );
  return (
    <PanelShell
      category="project"
      containerRef={containerRef}
      onKeyDown={onKeyDown}
      withSearch
      showTitle={showTitle}
      className={className}
    >
      <FilterMenuSearch
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search projects…"
      />
      <div className={listClassName}>
        {filtered.map((p) => {
          const projectId = String(p.id);
          function handleClick() {
            onToggleProject(projectId);
          }
          return (
            <OptionRow
              key={p.id}
              active={selectedProjectIds.includes(projectId)}
              label={p.name}
              onClick={handleClick}
            />
          );
        })}
        {filtered.length === 0 ? <EmptyHint message="No projects" /> : null}
      </div>
    </PanelShell>
  );
}
