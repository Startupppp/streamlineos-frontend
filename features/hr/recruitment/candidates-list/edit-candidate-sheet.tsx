"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useUpdateCandidate } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Candidate } from "@/types/hr";

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

const editCandidateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().or(z.literal("")),
  source: z.string(),
  currentRole: z.string().optional().or(z.literal("")),
  currentCompany: z.string().optional().or(z.literal("")),
  linkedinUrl: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type EditCandidateForm = z.infer<typeof editCandidateSchema>;

interface EditCandidateSheetProps {
  open: boolean;
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
}

export function EditCandidateSheet({
  open,
  candidate,
  onOpenChange,
}: EditCandidateSheetProps) {
  const updateCandidate = useUpdateCandidate();

  const defaultValues = useMemo<EditCandidateForm>(
    () => ({
      firstName: candidate?.firstName ?? "",
      lastName: candidate?.lastName ?? "",
      email: candidate?.email ?? "",
      phone: candidate?.phone ?? "",
      source: candidate?.source ?? "DIRECT",
      currentRole: candidate?.currentRole ?? "",
      currentCompany: candidate?.currentCompany ?? "",
      linkedinUrl: candidate?.linkedinUrl ?? "",
      notes: candidate?.notes ?? "",
    }),
    [candidate],
  );

  const handleSubmit = useCallback(
    (data: EditCandidateForm) => {
      if (!candidate) return;
      updateCandidate.mutate(
        {
          id: candidate.id,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
          source: data.source || undefined,
          currentRole: data.currentRole?.trim() || undefined,
          currentCompany: data.currentCompany?.trim() || undefined,
          linkedinUrl: data.linkedinUrl?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Candidate updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [candidate, updateCandidate, onOpenChange],
  );

  return (
    <EntityFormSheet<EditCandidateForm>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Candidate"
      description={
        candidate
          ? `Update details for ${candidate.firstName} ${candidate.lastName}`
          : undefined
      }
      resolver={zodResolver(editCandidateSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={updateCandidate.isPending}
      submitLabel={updateCandidate.isPending ? "Saving..." : "Save Changes"}
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
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                      <SelectItem value="CAMPUS">Campus</SelectItem>
                      <SelectItem value="NAUKRI">Naukri</SelectItem>
                      <SelectItem value="CAREERS_PAGE">Careers Page</SelectItem>
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
