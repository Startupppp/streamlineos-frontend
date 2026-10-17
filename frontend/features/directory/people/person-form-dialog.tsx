"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppDialog } from "@/components/shared/app-dialog";
import { useCreatePerson, useUpdatePerson } from "@/hooks/api/directory/people";
import { useCreateEngagement, useCreateWorker } from "@/hooks/api/directory/workers";
import type { OrganizationPerson } from "@/types/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";
import { PersonRoleFields } from "./person-role-fields";

const personSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  workEmail: z.string().email("Must be a valid email address").optional().or(z.literal("")),
  personalEmail: z.string().email("Must be a valid email address").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  designation: z.string().max(120).optional(),
  joiningDate: z.string().optional(),
});

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type PersonFormValues = z.infer<typeof personSchema>;

const EMPTY_DEFAULTS: PersonFormValues = {
  firstName: "",
  lastName: "",
  workEmail: "",
  personalEmail: "",
  phone: "",
  designation: "",
  joiningDate: "",
};

function toFormValues(person: OrganizationPerson): PersonFormValues {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    workEmail: person.workEmail ?? "",
    personalEmail: person.personalEmail ?? "",
    phone: person.phone ?? "",
    designation: "",
    joiningDate: "",
  };
}

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  defaultValues?: undefined;
}

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit";
  defaultValues: OrganizationPerson;
}

type Props = CreateProps | EditProps;

export function PersonFormDialog({ open, onOpenChange, mode, defaultValues }: Props) {
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const createWorker = useCreateWorker();
  const createEngagement = useCreateEngagement();

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && defaultValues) {
      form.reset(toFormValues(defaultValues));
    } else {
      form.reset(EMPTY_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  const isPending =
    createPerson.isPending ||
    updatePerson.isPending ||
    createWorker.isPending ||
    createEngagement.isPending;

  async function handleSubmit(values: PersonFormValues) {
    const workEmail = values.workEmail || undefined;
    const personalEmail = values.personalEmail || undefined;
    const phone = values.phone || undefined;

    if (mode === "create") {
      const designation = values.designation?.trim() ?? "";
      const joiningDate = values.joiningDate?.trim() ?? "";
      try {
        const created = await createPerson.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          ...(workEmail ? { workEmail } : {}),
          ...(personalEmail ? { personalEmail } : {}),
          ...(phone ? { phone } : {}),
        });
        if (designation || joiningDate) {
          try {
            const worker = await createWorker.mutateAsync({
              organizationPersonId: created.organizationPersonId,
            });
            await createEngagement.mutateAsync({
              workerId: worker.workerId,
              startsOn: joiningDate || todayIsoDate(),
              workerType: "FULL_TIME",
              isPrimary: true,
              ...(designation ? { designation } : {}),
            });
            toast.success("Person record added");
          } catch (error) {
            toast.success("Person record added");
            toast.error(
              `${getErrorMessage(error)} Their role and join date were not saved. Open the profile to add a worker record.`,
            );
          }
        } else {
          toast.success("Person record added");
        }
        onOpenChange(false);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    } else {
      if (!defaultValues) return;
      updatePerson.mutate(
        {
          organizationPersonId: defaultValues.organizationPersonId,
          firstName: values.firstName,
          lastName: values.lastName,
          workEmail: workEmail ?? null,
          personalEmail: personalEmail ?? null,
          phone: phone ?? null,
        },
        {
          onSuccess: () => {
            toast.success("Person updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const formId = mode === "edit" ? "person-edit-form" : "person-create-form";

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form={formId}
        size="sm"
        isPending={isPending}
        loadingText="Saving…"
      >
        {mode === "edit" ? "Save Changes" : "Add person record"}
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit person record" : "Add person record"}
      description={
        mode === "edit"
          ? "Update this person's directory profile."
          : "Create a profile for a worker, contractor, consultant, intern, or payee."
      }
      footer={footer}
    >
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          {mode === "create" ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              This does not send an invitation or grant access. If the work
              email already belongs to an organization member, their existing
              account is linked automatically.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jane" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Smith" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="workEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="jane@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="personalEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal email (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="jane@personal.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="+1 555 000 0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {mode === "create" ? <PersonRoleFields control={form.control} /> : null}
        </form>
      </Form>
    </AppDialog>
  );
}
