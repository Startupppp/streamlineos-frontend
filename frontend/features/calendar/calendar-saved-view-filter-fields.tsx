"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { useCalendarSources } from "@/hooks/api/calendar";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { usePeople } from "@/hooks/api/directory/people";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCalendarConnections } from "./use-calendar-connections";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

export function CalendarSavedViewFilterFields({ actorMembershipId }: { actorMembershipId: number | null }) {
  const form = useFormContext<CalendarSavedViewFormValues>();
  const [ownerSearch, setOwnerSearch] = useState("");
  const canSeePeople = useCan("directory:people:view");
  const search = useDebouncedValue(ownerSearch, 300);
  const sources = useCalendarSources();
  const connections = useCalendarConnections();
  const people = usePeople({ limit: 100, search });
  const projects = useInfiniteProjects({ limit: 100 });
  const peopleRows = (people.data?.data ?? []).filter(
    (person) => person.organizationMembershipId !== null,
  );
  const projectRows = projects.data?.pages.flatMap((page) => page.data) ?? [];
  const sourceValue = form.watch("sourceKey");
  const ownerValue = form.watch("ownerMembershipId");
  const projectValue = form.watch("projectId");
  const actionableValue = form.watch("actionable");
  const sourceOptions = [
    ...(sources.data ?? []).filter((source) => source.enabled).map((source) => ({ value: source.key, label: source.label })),
    ...(connections.data ?? []).filter((connection) => connection.status === "active" && (connection.toolkit === "googlecalendar" || connection.toolkit === "outlook")).map((connection) => ({
      value: `external:${connection.toolkit}:${connection.id}`,
      label: connection.accountEmail ?? `${connection.toolkit} account`,
    })),
  ];

  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm font-medium">Filters</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={sourceValue} onValueChange={(value) => form.setValue("sourceKey", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visible sources</SelectItem>
              {sourceOptions.map((source) => <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Owner</Label>
          {canSeePeople ? <Input value={ownerSearch} onChange={(event) => setOwnerSearch(event.target.value)} placeholder="Search members" aria-label="Find saved view owner" /> : null}
          <Select value={ownerValue} onValueChange={(value) => form.setValue("ownerMembershipId", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view owner"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {actorMembershipId ? <SelectItem value="me">Me</SelectItem> : null}
              {peopleRows.filter((person) => person.organizationMembershipId !== actorMembershipId).map((person) => (
                <SelectItem key={person.organizationPersonId} value={String(person.organizationMembershipId)}>
                  {person.displayName ?? `${person.firstName} ${person.lastName}`.trim()}
                </SelectItem>
              ))}
              {ownerValue !== "all" && ownerValue !== "me" && !peopleRows.some((person) => String(person.organizationMembershipId) === ownerValue) ? (
                <SelectItem value={ownerValue}>Selected member</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          {canSeePeople && people.data?.pageInfo.hasMore ? <p className="text-xs text-muted-foreground">Search by name to find more members.</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select value={projectValue} onValueChange={(value) => form.setValue("projectId", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view project"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any project</SelectItem>
              {projectRows.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.name}</SelectItem>)}
              {projectValue !== "all" && !projectRows.some((project) => String(project.id) === projectValue) ? <SelectItem value={projectValue}>Selected project</SelectItem> : null}
            </SelectContent>
          </Select>
          {projects.hasNextPage ? <Button type="button" size="sm" variant="ghost" disabled={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()}>More projects</Button> : null}
        </div>
        <div className="space-y-1.5">
          <Label>Action needed</Label>
          <Select value={actionableValue} onValueChange={(value) => form.setValue("actionable", value as CalendarSavedViewFormValues["actionable"], { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view action filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="true">Action needed</SelectItem>
              <SelectItem value="false">Informational</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saved-view-status">Exact status</Label>
          <Input id="saved-view-status" {...form.register("status")} maxLength={100} placeholder="For example, OPEN" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saved-view-location">Location contains</Label>
          <Input id="saved-view-location" {...form.register("location")} maxLength={200} placeholder="Office or meeting place" />
        </div>
      </div>
    </div>
  );
}
