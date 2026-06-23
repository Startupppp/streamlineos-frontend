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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addCandidateSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters")
    .regex(/[a-zA-Z]/, "First name must contain at least one letter"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters")
    .regex(/[a-zA-Z]/, "Last name must contain at least one letter"),
  email: z.string().email("Invalid email").max(254, "Email must be at most 254 characters"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number (7–15 digits)")
    .optional()
    .or(z.literal("")),
  source: z.string(),
  currentRole: z.string().max(100).optional().or(z.literal("")),
  currentCompany: z.string().max(100).optional().or(z.literal("")),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type AddCandidateForm = z.infer<typeof addCandidateSchema>;

const DEFAULT_VALUES: AddCandidateForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  source: "DIRECT",
  currentRole: "",
  currentCompany: "",
  linkedinUrl: "",
  notes: "",
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
          currentRole: data.currentRole?.trim() || undefined,
          currentCompany: data.currentCompany?.trim() || undefined,
          linkedinUrl: data.linkedinUrl?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
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
                  <FormLabel>First Name *</FormLabel>
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
                  <FormLabel>Last Name *</FormLabel>
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
                <FormLabel>Email *</FormLabel>
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
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                      <SelectItem value="NAUKRI">Naukri</SelectItem>
                      <SelectItem value="CAREERS_PAGE">Careers Page</SelectItem>
                      <SelectItem value="CAMPUS">Campus</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="currentRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Role</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Software Engineer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Company</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Acme Corp" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://linkedin.com/in/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    maxLength={2000}
                    className="resize-none w-full"
                    placeholder="Internal notes about this candidate..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
