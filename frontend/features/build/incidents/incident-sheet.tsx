"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  incidentFormSchema,
  type IncidentFormValues,
} from "@/features/build/incidents/incident-schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import {
  useCreateIncident,
  useUpdateIncident,
} from "@/hooks/api/build/incidents";
import { useProject } from "@/hooks/api/build/projects";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "@/types/projects";

const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: IncidentStatus[] = [
  "detected",
  "investigating",
  "mitigating",
  "resolved",
  "postmortem",
  "closed",
];
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
  detectedAt: "",
  responseDueAt: "",
  resolutionDueAt: "",
  linkedTicketId: "",
};

function toLocalDt(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

interface IncidentSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIncident: Incident | null;
}

export function IncidentSheet({
  projectId,
  open,
  onOpenChange,
  editIncident,
}: IncidentSheetProps) {
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  const INCIDENT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
  const INCIDENT_STATUSES = ["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"] as const;

  useEffect(() => {
    if (!open) return;
    if (editIncident) {
      form.reset({
        title: editIncident.title,
        description: editIncident.description ?? "",
        severity: INCIDENT_SEVERITIES.find((v) => v === editIncident.severity) ?? "medium",
        status: INCIDENT_STATUSES.find((v) => v === editIncident.status) ?? "detected",
        impact: editIncident.impact ?? "",
        ownerId: editIncident.ownerId ?? "",
        detectedAt: toLocalDt(editIncident.detectedAt),
        responseDueAt: toLocalDt(editIncident.responseDueAt),
        resolutionDueAt: toLocalDt(editIncident.resolutionDueAt),
        linkedTicketId:
          editIncident.linkedTicketId != null
            ? String(editIncident.linkedTicketId)
            : "",
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editIncident, form]);

  function handleSubmit(values: IncidentFormValues) {
    const input = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
      status: values.status,
      impact: values.impact || undefined,
      ownerId: values.ownerId || undefined,
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
    };

    if (editIncident) {
      update.mutate(
        { ...input, incidentId: editIncident.id },
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

              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dense">Impact</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="text-dense"
                        placeholder="Who / what is affected?"
                      />
                    </FormControl>
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
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
                <FormField
                  control={form.control}
                  name="detectedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Detected at</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          className="text-dense"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responseDueAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Response due</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          className="text-dense"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolutionDueAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Resolution due</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          className="text-dense"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
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
