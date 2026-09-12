"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EntityFormSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useCreateProject } from "@/hooks/api/inventory/projects";
import { ProjectFormFields } from "./project-form-fields";
import { projectFormSchema } from "./project-form-schema";
import type { ProjectFormOutput, ProjectFormValues } from "./project-form-schema";

/** An empty optional input is "not given", not an empty string the server must reject. */
const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);

export function ProjectCreateSheet() {
  const [open, setOpen] = useState(false);
  const canManage = useCan("inventory:projects:manage");
  const create = useCreateProject();
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  // Hidden rather than disabled: an action somebody may never take is not a
  // thing to explain on every visit. The server refuses it regardless.
  if (!canManage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        {...hoverHandlers}
      >
        <PlusIcon ref={iconRef} size={14} aria-hidden="true" />
        Add Project
      </button>

      <EntityFormSheet<ProjectFormValues, ProjectFormOutput>
        open={open}
        onOpenChange={setOpen}
        title="Add construction project"
        description="A project is a demand source: material is reserved out of the dark store that will serve it, and only leaves the ledger when it is dispatched."
        resolver={zodResolver(projectFormSchema)}
        resetOnOpen
        defaultValues={{ code: "", name: "", status: "PLANNING" }}
        isSubmitting={create.isPending}
        submitLabel={create.isPending ? "Creating\u2026" : "Create Project"}
        onSubmit={(values) => {
          create.mutate(
            {
              code: values.code,
              name: values.name,
              zone: values.zone ?? null,
              city: blank(values.city),
              siteAddress: blank(values.siteAddress),
              siteContactName: blank(values.siteContactName),
              siteContactPhone: blank(values.siteContactPhone),
              status: values.status,
              startsOn: blank(values.startsOn),
              endsOn: blank(values.endsOn),
              notes: blank(values.notes),
            },
            {
              onSuccess: (p) => {
                toast.success(`Project ${p.code} created`);
                setOpen(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        {(form) => <ProjectFormFields form={form} />}
      </EntityFormSheet>
    </>
  );
}
