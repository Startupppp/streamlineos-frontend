"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Phone, Briefcase, Building2, Link2, FileText, Zap } from "lucide-react";

import { useUpdateCandidate } from "@/hooks/api/hr";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const editCandidateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "First name must contain a letter or number"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Last name must contain a letter or number"),
  email: z.string().trim().email("Invalid email").max(254, "Email must be at most 254 characters"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number (7–15 digits)"),
  source: z.string(),
  currentRole: z.string().max(120).optional().or(z.literal("")),
  currentCompany: z.string().max(120).optional().or(z.literal("")),
  experienceYears: z.number().min(0, "Cannot be negative").max(50, "Cannot exceed 50 years").optional(),
  skills: z.string().max(500).optional().or(z.literal("")),
  linkedinUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("www."),
      "Enter a valid URL",
    ),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type EditCandidateForm = z.infer<typeof editCandidateSchema>;

interface EditCandidateSheetProps {
  open: boolean;
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
}

interface SectionHeaderProps {
  icon: React.ElementType;
  label: string;
  colorClass: string;
}

function SectionHeader({ icon: Icon, label, colorClass }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
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
      experienceYears: candidate?.experienceYears != null ? Number(candidate.experienceYears) : undefined,
      skills: candidate?.skills?.join(", ") ?? "",
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
          experienceYears: data.experienceYears,
          skills: data.skills?.trim()
            ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
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
      submitLabel="Save Changes"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-6">
          <div>
            <SectionHeader
              icon={User}
              label="Personal Information"
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="" />
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
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="" />
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
                    <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className="" />
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
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        Phone
                      </FormLabel>
                      <FormControl>
                        <PhoneInput defaultCountry="IN" {...field} />
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
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Source
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
            </div>
          </div>

          <div className="border-t border-border/60" />

          <div>
            <SectionHeader
              icon={Briefcase}
              label="Professional Background"
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="currentRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Current Role
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Software Engineer" className="" />
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
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        Company
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Acme Corp" className="" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Experience (yrs)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          max={50}
                          step={0.5}
                          placeholder="e.g. 3"
                          className=""
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(raw === "" ? undefined : Number(raw));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        Skills
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="React, Node.js..." className="" />
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
                    <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="h-3 w-3" />
                      LinkedIn URL
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://linkedin.com/in/..." className="" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="border-t border-border/60" />

          <div>
            <SectionHeader
              icon={FileText}
              label="Notes"
              colorClass="bg-muted text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400"
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      maxLength={2000}
                      className="resize-none w-full text-sm"
                      placeholder="Internal notes about this candidate..."
                    />
                  </FormControl>
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
