"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm, useWatch, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { incidentFormSchema, type IncidentFormValues } from "@/features/build/incidents/incident-schema";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import dynamic from "next/dynamic";
const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);
import { useCreateIncident, useUpdateIncident } from "@/hooks/api/build/incidents";
import { useProject } from "@/hooks/api/build/projects";
import { useReleases } from "@/hooks/api/build/releases";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import type { Incident, IncidentDetail, IncidentSeverity, IncidentStatus } from "@/hooks/api/build/incidents-schema";

const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: IncidentStatus[] = ["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"];
const NO_RELEASE = "none";
const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected",
  investigating: "Investigating",
  mitigating: "Mitigating",
  resolved: "Resolved",
  postmortem: "Post-mortem",
  closed: "Closed",
};

const DEFAULT_VALUES: IncidentFormValues = {
  title: "",
  description: "",
  severity: "medium",
  status: "detected",
  impact: "",
  ownerId: "",
  rootCause: "",
  customerComms: "",
  detectedAt: "",
  responseDueAt: "",
  resolutionDueAt: "",
  linkedTicketId: "",
  releaseId: "",
  followUpWaiverReason: "",
};

function toLocalDt(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}
function IncidentInputField({
  control,
  name,
  label,
  type,
  placeholder,
}: {
  control: Control<IncidentFormValues>;
  name: FieldPath<IncidentFormValues>;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-dense">{label}</FormLabel>
          <FormControl>
            <Input {...field} type={type} placeholder={placeholder} className="text-dense" />
          </FormControl>
          <FormMessage className="text-micro" />
        </FormItem>
      )}
    />
  );
}

function IncidentTextareaField({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<IncidentFormValues>;
  name: FieldPath<IncidentFormValues>;
  label: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-dense">{label}</FormLabel>
          <FormControl>
            <Textarea {...field} className="min-h-[72px] resize-none text-dense" placeholder={placeholder} />
          </FormControl>
          <FormMessage className="text-micro" />
        </FormItem>
      )}
    />
  );
}

interface IncidentSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIncident: Incident | IncidentDetail | null;
}

export function IncidentSheet({ projectId, open, onOpenChange, editIncident }: IncidentSheetProps) {
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const { data: project } = useProject(projectId);
  const releasesPage = useReleases(projectId);
  const releases = releasesPage.data?.data ?? [];
  const projectKey = project?.key ?? "";

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  useRegisterDirtyState(open && form.formState.isDirty);
  const selectedStatus = useWatch({ control: form.control, name: "status" });

  useEffect(() => {
    if (!open) return;
    if (editIncident) {
      form.reset({
        title: editIncident.title,
        description: editIncident.description ?? "",
        severity: SEVERITIES.find((value) => value === editIncident.severity) ?? "medium",
        status: STATUSES.find((value) => value === editIncident.status) ?? "detected",
        impact: editIncident.impact ?? "",
        ownerId: editIncident.ownerId ?? "",
        rootCause: editIncident.rootCause ?? "",
        customerComms: editIncident.customerComms ?? "",
        detectedAt: toLocalDt(editIncident.detectedAt),
        responseDueAt: toLocalDt(editIncident.responseDueAt),
        resolutionDueAt: toLocalDt(editIncident.resolutionDueAt),
        linkedTicketId:
          editIncident.linkedTicketId != null
            ? String(editIncident.linkedTicketId)
            : "",
        releaseId: editIncident.releaseId != null ? String(editIncident.releaseId) : "",
        followUpWaiverReason: "",
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editIncident, form]);

  function handleSubmit(values: IncidentFormValues) {
    const followUpActions = editIncident && "followUpActions" in editIncident
      ? editIncident.followUpActions
      : [];
    const unresolvedFollowUps = followUpActions.filter(
      (action) => action.status === "open" || action.status === "in_progress",
    ).length;
    if (editIncident && values.status === "closed" && unresolvedFollowUps > 0 && !values.followUpWaiverReason.trim()) {
      form.setError("followUpWaiverReason", { message: "Explain why unresolved follow-ups can be waived" });
      return;
    }
    const input = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
      status: values.status,
      impact: values.impact || undefined,
      ownerId: values.ownerId || undefined,
      rootCause: values.rootCause || undefined,
      customerComms: values.customerComms || undefined,
      detectedAt: values.detectedAt
        ? new Date(values.detectedAt).toISOString()
        : undefined,
      responseDueAt: values.responseDueAt
        ? new Date(values.responseDueAt).toISOString()
        : undefined,
      resolutionDueAt: values.resolutionDueAt
        ? new Date(values.resolutionDueAt).toISOString()
        : undefined,
      linkedTicketId: values.linkedTicketId
        ? Number(values.linkedTicketId)
        : undefined,
      releaseId: values.releaseId && values.releaseId !== NO_RELEASE
        ? Number(values.releaseId)
        : undefined,
    };

    if (editIncident) {
      update.mutate(
        {
          ...input,
          incidentId: editIncident.id,
          followUpWaiverReason: values.followUpWaiverReason.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Incident updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("Incident created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>
            {editIncident ? "Edit Incident" : "New Incident"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            id="incident-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-5 py-4 space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="text-dense"
                        placeholder="Short incident summary"
                      />
                    </FormControl>
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Description</FormLabel>
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
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Severity</FormLabel>
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
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Status</FormLabel>
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
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
              </div>

              <IncidentInputField
                control={form.control}
                name="impact"
                label="Impact"
                placeholder="Who / what is affected?"
              />

              <IncidentTextareaField
                control={form.control}
                name="rootCause"
                label="Root cause"
                placeholder="What caused the incident?"
              />

              <IncidentTextareaField
                control={form.control}
                name="customerComms"
                label="Customer communication"
                placeholder="What has been communicated?"
              />

              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Owner</FormLabel>
                    <ProjectMemberSelect
                      projectId={projectId}
                      mode="single"
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                      allowUnassigned
                      placeholder="Unassigned"
                      className="text-dense"
                    />
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <IncidentInputField
                  control={form.control}
                  name="detectedAt"
                  label="Detected at"
                  type="datetime-local"
                />
                <IncidentInputField
                  control={form.control}
                  name="responseDueAt"
                  label="Response due"
                  type="datetime-local"
                />
                <IncidentInputField
                  control={form.control}
                  name="resolutionDueAt"
                  label="Resolution due"
                  type="datetime-local"
                />
              </div>

              <FormField
                control={form.control}
                name="linkedTicketId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Linked Ticket</FormLabel>
                    <FormControl>
                      <TicketCombobox
                        projectId={projectId}
                        projectKey={projectKey}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Link a ticket…"
                        allowClear
                        className="text-dense"
                      />
                    </FormControl>
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="releaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Affected release</FormLabel>
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
                    <FormMessage className="text-micro" />
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
                  control={form.control}
                  name="followUpWaiverReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Closure waiver</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="text-dense min-h-[72px] resize-none" placeholder="Why can unresolved follow-ups be waived?" />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
              ) : null}
            </SheetBody>

            <SheetFooter className="px-5 py-3 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="text-dense">
                    Cancel
                  </Button>
                </SheetClose>
                <LoadingButton
                  type="submit"
                  size="sm"
                  className="text-dense"
                  isPending={isPending}
                  loadingText="Saving…"
                >
                  {editIncident ? "Save Changes" : "Create Incident"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
