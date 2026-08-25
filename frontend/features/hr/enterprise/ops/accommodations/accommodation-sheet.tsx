"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useCreateAccommodation } from "@/hooks/api/hr/enterprise-ops-accommodations";

const schema = z.object({
  userId: z.string().min(1, "Employee is required"),
  type: z.enum(["equipment", "schedule", "workspace", "medical_restriction", "other"]),
  description: z.string().min(5, "Description is required"),
  confidentialMedicalNote: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_OPTIONS = [
  { value: "equipment", label: "Equipment" },
  { value: "schedule", label: "Schedule Adjustment" },
  { value: "workspace", label: "Workspace Modification" },
  { value: "medical_restriction", label: "Medical Restriction" },
  { value: "other", label: "Other" },
];

export function AccommodationSheet({ open, onOpenChange }: Props) {
  const canSensitive = useCan("hr:sensitive:view");
  const create = useCreateAccommodation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", type: "other", description: "", confidentialMedicalNote: "" },
  });

  function onSubmit(values: FormValues) {
    create.mutate(
      {
        ...values,
        confidentialMedicalNote: values.confidentialMedicalNote || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New Accommodation Request</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select employee"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Describe the accommodation needed…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canSensitive && (
              <FormField
                control={form.control}
                name="confidentialMedicalNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-status-warning-ink">
                      Confidential Medical Note
                      <span className="text-xs font-normal text-muted-foreground">(visible only to hr:sensitive:view)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Medical details (restricted)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={create.isPending} loadingText="Creating…" className="w-full">
                Create Request
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
