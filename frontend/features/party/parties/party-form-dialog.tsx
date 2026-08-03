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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppDialog } from "@/components/shared/app-dialog";
import { useCreateParty, useUpdateParty } from "@/hooks/api/party/parties";
import type { BusinessParty } from "@/types/party/parties";
import { getErrorMessage } from "@/lib/get-error-message";

const partySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  partyType: z.enum(["CUSTOMER", "VENDOR", "PARTNER", "BOTH"]),
  legalName: z.string().max(300).optional(),
  taxNumber: z.string().max(100).optional(),
  email: z
    .string()
    .email("Must be a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(30).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type PartyFormValues = z.infer<typeof partySchema>;

const EMPTY_DEFAULTS: PartyFormValues = {
  name: "",
  partyType: "CUSTOMER",
  legalName: "",
  taxNumber: "",
  email: "",
  phone: "",
  website: "",
};

function toFormValues(party: BusinessParty): PartyFormValues {
  return {
    name: party.name,
    partyType: party.partyType,
    legalName: party.legalName ?? "",
    taxNumber: party.taxNumber ?? "",
    email: party.email ?? "",
    phone: party.phone ?? "",
    website: party.website ?? "",
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
  defaultValues: BusinessParty;
}

type Props = CreateProps | EditProps;

export function PartyFormDialog({ open, onOpenChange, mode, defaultValues }: Props) {
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();

  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
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
    mode === "create" ? createParty.isPending : updateParty.isPending;

  function handleSubmit(values: PartyFormValues) {
    const legalName = values.legalName || undefined;
    const taxNumber = values.taxNumber || undefined;
    const email = values.email || undefined;
    const phone = values.phone || undefined;
    const website = values.website || undefined;

    if (mode === "create") {
      createParty.mutate(
        {
          name: values.name,
          partyType: values.partyType,
          ...(legalName ? { legalName } : {}),
          ...(taxNumber ? { taxNumber } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(website ? { website } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Party added");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      if (!defaultValues) return;
      updateParty.mutate(
        {
          partyId: defaultValues.partyId,
          name: values.name,
          partyType: values.partyType,
          legalName: legalName ?? null,
          taxNumber: taxNumber ?? null,
          email: email ?? null,
          phone: phone ?? null,
          website: website ?? null,
        },
        {
          onSuccess: () => {
            toast.success("Party updated");
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

  const formId = mode === "edit" ? "party-edit-form" : "party-create-form";

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
        {mode === "edit" ? "Save Changes" : "Add Party"}
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit Party" : "Add Party"}
      description={
        mode === "edit"
          ? "Update this party's details."
          : "Add a customer, vendor or partner to your directory."
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Acme Corp" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="partyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="BOTH">Customer &amp; Vendor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal name (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Acme Corporation Ltd." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax number (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="GST / VAT / EIN" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="contact@acme.com" />
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
          </div>
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="url" placeholder="https://acme.com" />
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
