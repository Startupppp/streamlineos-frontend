"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { useCreateDeal } from "@/hooks/api/crm";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const createDealSchema = z.object({
  name: z
    .string()
    .min(1, "Deal name is required")
    .regex(/^[A-Za-z]/, "Name must start with a letter"),
  value: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || Number(v) >= 0, "Value cannot be negative"),
  stage: z.string().min(1),
  probability: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || (Number(v) >= 0 && Number(v) <= 100),
      "Must be between 0 and 100",
    ),
  contactPerson: z
    .string()
    .regex(/^[A-Za-z\s]*$/, "Only letters allowed")
    .optional()
    .or(z.literal("")),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CreateDealFormValues = z.infer<typeof createDealSchema>;

interface CreateDealFormProps {
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}

export function CreateDealForm({ employees, onSuccess }: CreateDealFormProps) {
  const createMutation = useCreateDeal();
  const { data: stages = [] } = useCrmStages("deal");

  const form = useForm<CreateDealFormValues>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      name: "",
      value: "",
      stage: "",
      probability: "0",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      assignedToId: "",
      expectedCloseDate: "",
      notes: "",
    },
  });

  const handleSubmit = useCallback(
    (data: CreateDealFormValues) => {
      createMutation.mutate(
        {
          name: data.name,
          value: String(Number(data.value) || 0),
          stage: data.stage,
          probability: Number(data.probability) || 0,
          contactPerson: data.contactPerson || undefined,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          assignedToId: data.assignedToId || undefined,
          expectedCloseDate: data.expectedCloseDate || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Deal created");
            onSuccess();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, onSuccess],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Enterprise License"
                      className="capitalize"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value (INR)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full h-8">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", getCrmTokenClasses(s.color).dotClass)} />
                          {s.label}
                        </div>
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
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probability (%)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedCloseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Close</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="Name" className="capitalize" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <PhoneInput
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={field.value || undefined}
                    onChange={(value) => field.onChange(value ?? "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full h-8">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name || e.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          className="w-full"
          isPending={createMutation.isPending}
          loadingText="Creating..."
        >
          Create Deal
        </LoadingButton>
      </form>
    </Form>
  );
}
