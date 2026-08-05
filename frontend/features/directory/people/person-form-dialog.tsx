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
import type { OrganizationPerson } from "@/types/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";

const personSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  workEmail: z.string().email("Must be a valid email address").optional().or(z.literal("")),
  personalEmail: z.string().email("Must be a valid email address").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

type PersonFormValues = z.infer<typeof personSchema>;

const EMPTY_DEFAULTS: PersonFormValues = {
  firstName: "",
  lastName: "",
  workEmail: "",
  personalEmail: "",
  phone: "",
};

function toFormValues(person: OrganizationPerson): PersonFormValues {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    workEmail: person.workEmail ?? "",
    personalEmail: person.personalEmail ?? "",
    phone: person.phone ?? "",
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
    mode === "create" ? createPerson.isPending : updatePerson.isPending;

  function handleSubmit(values: PersonFormValues) {
    const workEmail = values.workEmail || undefined;
    const personalEmail = values.personalEmail || undefined;
    const phone = values.phone || undefined;

    if (mode === "create") {
      createPerson.mutate(
        {
          firstName: values.firstName,
          lastName: values.lastName,
          ...(workEmail ? { workEmail } : {}),
          ...(personalEmail ? { personalEmail } : {}),
          ...(phone ? { phone } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Person record added");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
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
              This creates a directory record only. It does not send an
              invitation, create a login, or grant application access.
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
        </form>
      </Form>
    </AppDialog>
  );
}
