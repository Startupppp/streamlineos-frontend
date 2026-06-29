"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Globe, Palette, Network, GitBranch, Briefcase,
  Users, Mail, CheckCircle2, ChevronRight, ChevronLeft, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import { useInviteUser } from "@/hooks/api/organization";
import { useCreateBusinessUnit, useCreateOrgBranch, useCreateOrgDepartment, useCreateOrgTeam } from "@/hooks/api/org-hierarchy";

const STEPS = [
  { id: "profile",       label: "Profile",       icon: Building2,  desc: "Organization basics" },
  { id: "localization",  label: "Localization",  icon: Globe,      desc: "Timezone & format" },
  { id: "branding",      label: "Branding",      icon: Palette,    desc: "Logo & colors" },
  { id: "business-unit", label: "Business Unit", icon: Network,    desc: "Top-level division" },
  { id: "branch",        label: "Branch",        icon: GitBranch,  desc: "Office location" },
  { id: "department",    label: "Department",    icon: Briefcase,  desc: "Functional team" },
  { id: "team",          label: "Team",          icon: Users,      desc: "Working group" },
  { id: "invite",        label: "Invite",        icon: Mail,       desc: "Bring teammates" },
  { id: "done",          label: "Done",          icon: CheckCircle2, desc: "You\'re all set!" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const profileSchema = z.object({
  name: z.string().min(1, "Required"),
  legalName: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
  supportEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

const localizationSchema = z.object({
  timezone: z.string().min(1, "Required"),
  currency: z.enum(["USD", "EUR", "INR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"]),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(["12h", "24h"]),
  weekStartDay: z.enum(["monday", "sunday", "saturday"]),
  language: z.string().min(2),
});

const brandingSchema = z.object({
  logo: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format: #RRGGBB").optional().or(z.literal("")),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format: #RRGGBB").optional().or(z.literal("")),
});

const businessUnitSchema = z.object({
  buName: z.string().min(1, "Required"),
  buCode: z.string().min(1, "Required").max(10),
  buDescription: z.string().optional(),
});

const branchSchema = z.object({
  branchName: z.string().min(1, "Required"),
  branchCode: z.string().min(1, "Required").max(10),
  branchCity: z.string().optional(),
  branchCountry: z.string().optional(),
});

const departmentSchema = z.object({
  deptName: z.string().min(1, "Required"),
  deptCode: z.string().min(1, "Required").max(10),
});

const teamSchema = z.object({
  teamName: z.string().min(1, "Required"),
  teamCode: z.string().min(1, "Required").max(10),
});

const inviteSchema = z.object({
  invites: z.array(z.object({
    email: z.string().email("Enter a valid email"),
    role: z.string().min(1),
  })).min(0),
});

type ProfileValues = z.infer<typeof profileSchema>;
type LocalizationValues = z.infer<typeof localizationSchema>;
type BrandingValues = z.infer<typeof brandingSchema>;
type BusinessUnitValues = z.infer<typeof businessUnitSchema>;
type BranchValues = z.infer<typeof branchSchema>;
type DepartmentValues = z.infer<typeof departmentSchema>;
type TeamValues = z.infer<typeof teamSchema>;

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Dubai",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "hi", label: "Hindi" },
];

const ROLES = ["admin", "manager", "member", "viewer"];

function StepIndicator({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <div className="flex items-center gap-1 flex-wrap justify-center">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone = completed.has(i);
        const isActive = i === current;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                isDone
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground",
              )}
              title={step.label}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 w-4 transition-colors", isDone ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-0.5">{message}</p>;
}

function ProfileStep({ onNext }: { onNext: (v: ProfileValues) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1">
        <Label>Organization Name *</Label>
        <Input placeholder="Acme Corp" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div className="space-y-1">
        <Label>Legal Name</Label>
        <Input placeholder="Acme Corporation Inc." {...register("legalName")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Website</Label>
          <Input placeholder="https://example.com" {...register("website")} />
          <FieldError message={errors.website?.message} />
        </div>
        <div className="space-y-1">
          <Label>Industry</Label>
          <Input placeholder="Technology" {...register("industry")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Support Email</Label>
        <Input placeholder="support@example.com" {...register("supportEmail")} />
        <FieldError message={errors.supportEmail?.message} />
      </div>
      <Button type="submit" className="w-full">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
    </form>
  );
}

function LocalizationStep({ onNext, onBack }: { onNext: (v: LocalizationValues) => void; onBack: () => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LocalizationValues>({
    resolver: zodResolver(localizationSchema),
    defaultValues: { timezone: "UTC", currency: "USD", dateFormat: "MM/DD/YYYY", timeFormat: "12h", weekStartDay: "monday", language: "en" },
  });
  const tz = watch("timezone");
  const curr = watch("currency");
  const df = watch("dateFormat");
  const tf = watch("timeFormat");
  const wsd = watch("weekStartDay");
  const lang = watch("language");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Timezone *</Label>
          <Select value={tz} onValueChange={(v) => setValue("timezone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError message={errors.timezone?.message} />
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Select value={curr} onValueChange={(v) => setValue("currency", v as LocalizationValues["currency"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD", "EUR", "INR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Date Format</Label>
          <Select value={df} onValueChange={(v) => setValue("dateFormat", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Time Format</Label>
          <Select value={tf} onValueChange={(v) => setValue("timeFormat", v as "12h" | "24h")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12h">12-hour</SelectItem>
              <SelectItem value="24h">24-hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Week Starts On</Label>
          <Select value={wsd} onValueChange={(v) => setValue("weekStartDay", v as LocalizationValues["weekStartDay"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="sunday">Sunday</SelectItem>
              <SelectItem value="saturday">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Language</Label>
          <Select value={lang} onValueChange={(v) => setValue("language", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

function BrandingStep({ onNext, onSkip, onBack }: { onNext: (v: BrandingValues) => void; onSkip: () => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<BrandingValues>({ resolver: zodResolver(brandingSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1">
        <Label>Logo URL</Label>
        <Input placeholder="https://cdn.example.com/logo.png" {...register("logo")} />
        <FieldError message={errors.logo?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Primary Color</Label>
          <Input placeholder="#3B82F6" {...register("primaryColor")} />
          <FieldError message={errors.primaryColor?.message} />
        </div>
        <div className="space-y-1">
          <Label>Secondary Color</Label>
          <Input placeholder="#10B981" {...register("secondaryColor")} />
          <FieldError message={errors.secondaryColor?.message} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

function BusinessUnitStep({ onNext, onSkip, onBack }: { onNext: (v: BusinessUnitValues) => void; onSkip: () => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<BusinessUnitValues>({ resolver: zodResolver(businessUnitSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">A business unit is your top-level organizational division (e.g., APAC, Engineering).</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Name *</Label>
          <Input placeholder="Asia Pacific" {...register("buName")} />
          <FieldError message={errors.buName?.message} />
        </div>
        <div className="space-y-1">
          <Label>Code *</Label>
          <Input placeholder="APAC" className="uppercase" {...register("buCode")} />
          <FieldError message={errors.buCode?.message} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Input placeholder="Optional description" {...register("buDescription")} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

function BranchStep({ onNext, onSkip, onBack }: { onNext: (v: BranchValues) => void; onSkip: () => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<BranchValues>({ resolver: zodResolver(branchSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">A branch is a physical office or regional location.</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Name *</Label>
          <Input placeholder="Mumbai HQ" {...register("branchName")} />
          <FieldError message={errors.branchName?.message} />
        </div>
        <div className="space-y-1">
          <Label>Code *</Label>
          <Input placeholder="MUM" className="uppercase" {...register("branchCode")} />
          <FieldError message={errors.branchCode?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>City</Label>
          <Input placeholder="Mumbai" {...register("branchCity")} />
        </div>
        <div className="space-y-1">
          <Label>Country</Label>
          <Input placeholder="India" {...register("branchCountry")} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

function DepartmentStep({ onNext, onSkip, onBack }: { onNext: (v: DepartmentValues) => void; onSkip: () => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">A department groups people by function (e.g., Engineering, Finance, HR).</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Name *</Label>
          <Input placeholder="Engineering" {...register("deptName")} />
          <FieldError message={errors.deptName?.message} />
        </div>
        <div className="space-y-1">
          <Label>Code *</Label>
          <Input placeholder="ENG" className="uppercase" {...register("deptCode")} />
          <FieldError message={errors.deptCode?.message} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

function TeamStep({ onNext, onSkip, onBack }: { onNext: (v: TeamValues) => void; onSkip: () => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<TeamValues>({ resolver: zodResolver(teamSchema) });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">A team is a working group within a department (e.g., Backend, Frontend, QA).</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Name *</Label>
          <Input placeholder="Backend" {...register("teamName")} />
          <FieldError message={errors.teamName?.message} />
        </div>
        <div className="space-y-1">
          <Label>Code *</Label>
          <Input placeholder="BE" className="uppercase" {...register("teamCode")} />
          <FieldError message={errors.teamCode?.message} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="submit" className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </form>
  );
}

interface InviteEntry {
  email: string;
  role: string;
}

function InviteStep({
  onNext, onSkip, onBack,
}: {
  onNext: (invites: InviteEntry[]) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [invites, setInvites] = useState<InviteEntry[]>([{ email: "", role: "member" }]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const addRow = () => setInvites((prev) => [...prev, { email: "", role: "member" }]);
  const removeRow = (i: number) => setInvites((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof InviteEntry, value: string) => {
    setInvites((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const handleSubmit = () => {
    const newErrors: Record<number, string> = {};
    invites.forEach((inv, i) => {
      if (inv.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)) {
        newErrors[i] = "Invalid email";
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const valid = invites.filter((inv) => inv.email.trim());
    onNext(valid);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Invite teammates to join your organization. They'll receive an email with setup instructions.
      </p>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {invites.map((inv, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-0.5">
              <Input
                placeholder="email@example.com"
                value={inv.email}
                onChange={(e) => updateRow(i, "email", e.target.value)}
                className={errors[i] ? "border-destructive" : ""}
              />
              {errors[i] && <p className="text-xs text-destructive">{errors[i]}</p>}
            </div>
            <Select value={inv.role} onValueChange={(v) => updateRow(i, "role", v)}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {invites.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeRow(i)}>×</Button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full text-sm">
        + Add another
      </Button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">Skip</Button>
        <Button type="button" onClick={handleSubmit} className="flex-1">Send Invites <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}

function DoneStep({ summary, onGoToDashboard }: { summary: string[]; onGoToDashboard: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-1">You're all set!</h3>
        <p className="text-sm text-muted-foreground">Your organization is configured and ready to use.</p>
      </div>
      {summary.length > 0 && (
        <div className="text-left space-y-1.5 bg-muted/40 rounded-lg p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What was set up</p>
          {summary.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      <Button onClick={onGoToDashboard} className="w-full">Go to Dashboard</Button>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);

  const updateOrgSettings = useUpdateOrgSettings();
  const inviteUser = useInviteUser();
  const createBusinessUnit = useCreateBusinessUnit();
  const createBranch = useCreateOrgBranch();
  const createDepartment = useCreateOrgDepartment();
  const createTeam = useCreateOrgTeam();

  const markDone = useCallback((step: number) => {
    setCompleted((prev) => new Set([...prev, step]));
    setCurrentStep(step + 1);
  }, []);

  const handleProfile = useCallback(async (values: ProfileValues) => {
    setIsLoading(true);
    try {
      await updateOrgSettings.mutateAsync({
        name: values.name,
        legalName: values.legalName || undefined,
        website: values.website || undefined,
        industry: values.industry || undefined,
        supportEmail: values.supportEmail || undefined,
      });
      setSummary((prev) => [...prev, `Organization: ${values.name}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(0);
  }, [updateOrgSettings, markDone]);

  const handleLocalization = useCallback(async (values: LocalizationValues) => {
    setIsLoading(true);
    try {
      await updateOrgSettings.mutateAsync({
        timezone: values.timezone,
        currency: values.currency,
        dateFormat: values.dateFormat,
        timeFormat: values.timeFormat,
        weekStartDay: values.weekStartDay,
        language: values.language,
      });
      setSummary((prev) => [...prev, `Localization: ${values.timezone}, ${values.currency}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(1);
  }, [updateOrgSettings, markDone]);

  const handleBranding = useCallback(async (values: BrandingValues) => {
    setIsLoading(true);
    try {
      await updateOrgSettings.mutateAsync({
        logo: values.logo || undefined,
        primaryColor: values.primaryColor || undefined,
        secondaryColor: values.secondaryColor || undefined,
      });
      if (values.logo || values.primaryColor) {
        setSummary((prev) => [...prev, "Branding applied"]);
      }
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(2);
  }, [updateOrgSettings, markDone]);

  const handleBusinessUnit = useCallback(async (values: BusinessUnitValues) => {
    setIsLoading(true);
    try {
      await createBusinessUnit.mutateAsync({ name: values.buName, code: values.buCode, description: values.buDescription });
      setSummary((prev) => [...prev, `Business Unit: ${values.buName}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(3);
  }, [createBusinessUnit, markDone]);

  const handleBranch = useCallback(async (values: BranchValues) => {
    setIsLoading(true);
    try {
      await createBranch.mutateAsync({ name: values.branchName, code: values.branchCode, city: values.branchCity, country: values.branchCountry });
      setSummary((prev) => [...prev, `Branch: ${values.branchName}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(4);
  }, [createBranch, markDone]);

  const handleDepartment = useCallback(async (values: DepartmentValues) => {
    setIsLoading(true);
    try {
      await createDepartment.mutateAsync({ name: values.deptName, code: values.deptCode });
      setSummary((prev) => [...prev, `Department: ${values.deptName}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(5);
  }, [createDepartment, markDone]);

  const handleTeam = useCallback(async (values: TeamValues) => {
    setIsLoading(true);
    try {
      await createTeam.mutateAsync({ name: values.teamName, code: values.teamCode });
      setSummary((prev) => [...prev, `Team: ${values.teamName}`]);
    } catch { /* continue */ }
    setIsLoading(false);
    markDone(6);
  }, [createTeam, markDone]);

  const handleInvites = useCallback(async (invites: InviteEntry[]) => {
    setIsLoading(true);
    let sent = 0;
    for (const inv of invites) {
      try {
        await inviteUser.mutateAsync({ email: inv.email, role: inv.role });
        sent++;
      } catch { /* continue */ }
    }
    if (sent > 0) setSummary((prev) => [...prev, `${sent} invite${sent > 1 ? "s" : ""} sent`]);
    setIsLoading(false);
    markDone(7);
  }, [inviteUser, markDone]);

  const currentStepDef = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Set up your organization</h1>
          <p className="text-sm text-muted-foreground">
            Step {Math.min(currentStep + 1, STEPS.length)} of {STEPS.length}
          </p>
        </div>

        <StepIndicator current={currentStep} completed={completed} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <CardContent className="pt-6 pb-6">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Saving…</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        {currentStepDef && <currentStepDef.icon className="h-4 w-4 text-primary" />}
                        <h2 className="text-base font-semibold">{currentStepDef?.label}</h2>
                        {currentStep > 2 && currentStep < 8 && (
                          <Badge variant="outline" className="text-[10px] ml-1 py-0">Optional</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{currentStepDef?.desc}</p>
                    </div>

                    {currentStep === 0 && <ProfileStep onNext={handleProfile} />}
                    {currentStep === 1 && <LocalizationStep onNext={handleLocalization} onBack={() => setCurrentStep(0)} />}
                    {currentStep === 2 && (
                      <BrandingStep
                        onNext={handleBranding}
                        onSkip={() => markDone(2)}
                        onBack={() => setCurrentStep(1)}
                      />
                    )}
                    {currentStep === 3 && (
                      <BusinessUnitStep
                        onNext={handleBusinessUnit}
                        onSkip={() => markDone(3)}
                        onBack={() => setCurrentStep(2)}
                      />
                    )}
                    {currentStep === 4 && (
                      <BranchStep
                        onNext={handleBranch}
                        onSkip={() => markDone(4)}
                        onBack={() => setCurrentStep(3)}
                      />
                    )}
                    {currentStep === 5 && (
                      <DepartmentStep
                        onNext={handleDepartment}
                        onSkip={() => markDone(5)}
                        onBack={() => setCurrentStep(4)}
                      />
                    )}
                    {currentStep === 6 && (
                      <TeamStep
                        onNext={handleTeam}
                        onSkip={() => markDone(6)}
                        onBack={() => setCurrentStep(5)}
                      />
                    )}
                    {currentStep === 7 && (
                      <InviteStep
                        onNext={handleInvites}
                        onSkip={() => markDone(7)}
                        onBack={() => setCurrentStep(6)}
                      />
                    )}
                    {currentStep === 8 && (
                      <DoneStep
                        summary={summary}
                        onGoToDashboard={() => router.push("/dashboard")}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
