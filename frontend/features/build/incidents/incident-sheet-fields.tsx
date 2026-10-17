"use client";

import type { Control } from "react-hook-form";
import dynamic from "next/dynamic";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetBody } from "@/components/ui/sheet";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import { IncidentInputField, IncidentTextareaField } from "./incident-form-helpers";
import type { IncidentFormValues } from "@/features/build/incidents/incident-schema";
import type {
  IncidentsCreateIncidentResponse,
  IncidentsGetIncidentResponse,
} from "@/contracts/build-contracts.generated";
import type { IncidentStatus } from "@/hooks/api/build/incidents-schema";
import {
  SEVERITIES,
  STATUSES,
  STATUS_LABELS,
  NO_RELEASE,
} from "./incident-sheet-constants";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);

interface IncidentSheetFieldsProps {
  control: Control<IncidentFormValues>;
  projectId: number;
  projectKey: string;
  releases: Array<{ id: number; name: string }>;
  editIncident: IncidentsCreateIncidentResponse | IncidentsGetIncidentResponse | null;
  selectedStatus: IncidentStatus;
}

export function IncidentSheetFields({
  control,
  projectId,
  projectKey,
  releases,
  editIncident,
  selectedStatus,
}: IncidentSheetFieldsProps) {
  return (
    <SheetBody className="px-5 py-4 space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Short incident summary"
              />
            </FormControl>
            <FormMessage />
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
              <TiptapEditor
                content={field.value}
                output="html"
                onChangeHtml={field.onChange}
                placeholder="What happened?"
                minHeightClassName="min-h-[80px]"
                menuMode="static"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <IncidentInputField
        control={control}
        name="impact"
        label="Impact"
        placeholder="Who / what is affected?"
      />

      <IncidentTextareaField
        control={control}
        name="rootCause"
        label="Root cause"
        placeholder="What caused the incident?"
      />

      <IncidentTextareaField
        control={control}
        name="customerComms"
        label="Customer communication"
        placeholder="What has been communicated?"
      />

      <FormField
        control={control}
        name="ownerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Owner</FormLabel>
            <ProjectMemberSelect
              projectId={projectId}
              mode="single"
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              allowUnassigned
              placeholder="Unassigned"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4">
        <IncidentInputField
          control={control}
          name="detectedAt"
          label="Detected at"
          type="datetime-local"
        />
        <IncidentInputField
          control={control}
          name="responseDueAt"
          label="Response due"
          type="datetime-local"
        />
        <IncidentInputField
          control={control}
          name="resolutionDueAt"
          label="Resolution due"
          type="datetime-local"
        />
      </div>

      <FormField
        control={control}
        name="linkedTicketId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Linked Ticket</FormLabel>
            <FormControl>
              <TicketCombobox
                projectId={projectId}
                projectKey={projectKey}
                value={field.value}
                onChange={field.onChange}
                placeholder="Link a ticket…"
                allowClear
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="releaseId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Affected release</FormLabel>
            <Select value={field.value || NO_RELEASE} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="No release" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_RELEASE}>No release</SelectItem>
                {releases.map((release) => (
                  <SelectItem key={release.id} value={String(release.id)}>
                    {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {editIncident &&
      "followUpActions" in editIncident &&
      selectedStatus === "closed" &&
      editIncident.followUpActions.some(
        (action) => action.status === "open" || action.status === "in_progress",
      ) ? (
        <FormField
          control={control}
          name="followUpWaiverReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Closure waiver</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-[72px] resize-none" placeholder="Why can unresolved follow-ups be waived?" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </SheetBody>
  );
}
