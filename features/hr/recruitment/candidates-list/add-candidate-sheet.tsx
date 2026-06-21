"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useCreateCandidate } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";

import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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

const addCandidateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().or(z.literal("")),
  source: z.string(),
});

type AddCandidateForm = z.infer<typeof addCandidateSchema>;

const DEFAULT_VALUES: AddCandidateForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  source: "DIRECT",
};

interface AddCandidateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCandidateSheet({ open, onOpenChange }: AddCandidateSheetProps) {
  const createCandidate = useCreateCandidate();

  const handleSubmit = useCallback(
    (data: AddCandidateForm) => {
      createCandidate.mutate(
        {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
          source: data.source,
        },
        {
          onSuccess: () => {
            toast.success("Candidate added");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createCandidate, onOpenChange],
  );

  return (
    <EntityFormSheet<AddCandidateForm>
      open={open}
      onOpenChange={onOpenChange}
      title="Add Candidate"
      description="Add a new candidate to the pipeline."
      resolver={zodResolver(addCandidateSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createCandidate.isPending}
      submitLabel={createCandidate.isPending ? "Adding..." : "Add Candidate"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                      <SelectItem value="CAMPUS">Campus</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </EntityFormSheet>
  );
}
