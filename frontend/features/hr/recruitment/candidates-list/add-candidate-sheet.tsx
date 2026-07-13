"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Phone, Briefcase, Building2, Link2, FileText, Zap } from "lucide-react";

import { useCreateCandidate } from "@/hooks/api/hr";
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
  experienceYears: z.number().min(0, "Cannot be negative").max(50, "Cannot exceed 50 years").optional(),
  skills: z.string().max(500).optional().or(z.literal("")),
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
  experienceYears: undefined,
  skills: "",
  linkedinUrl: "",
  notes: "",
};

interface AddCandidateSheetProps {
  open: boolean;
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
          experienceYears: data.experienceYears,
          skills: data.skills?.trim()
            ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
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
      description="Add a new candidate to the recruitment pipeline."
      resolver={zodResolver(addCandidateSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createCandidate.isPending}
      submitLabel={createCandidate.isPending ? "Adding..." : "Add Candidate"}
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
                        <Input {...field} className="h-9" />
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
                        <Input {...field} className="h-9" />
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
                      <Input {...field} type="email" className="h-9" />
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
                          <SelectTrigger className="h-9">
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
            </div>
          </div>

          <div className="border-t border-border/60" />

          <div>
            <SectionHeader
              icon={Briefcase}
              label="Professional Background"
              colorClass="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
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
                        <Input {...field} placeholder="e.g. Software Engineer" className="h-9" />
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
                        <Input {...field} placeholder="e.g. Acme Corp" className="h-9" />
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
                          className="h-9"
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
                        <Input {...field} placeholder="React, Node.js..." className="h-9" />
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
                      <Input {...field} placeholder="https://linkedin.com/in/..." className="h-9" />
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
