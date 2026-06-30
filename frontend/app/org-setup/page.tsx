"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Plus, Trash2, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 7;

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Retail & E-commerce",
  "Manufacturing", "Education", "Real Estate", "Logistics & Supply Chain",
  "Marketing & Advertising", "Consulting", "Legal", "Media & Entertainment",
  "Hospitality & Travel", "Non-profit", "Other",
] as const;

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
] as const;

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "UAE", "Other",
] as const;

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC",
] as const;

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "SGD", "AED", "CAD", "JPY"] as const;

const LANGUAGES = ["en", "hi", "fr", "de", "es", "pt", "ar", "zh", "ja"] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English", hi: "Hindi", fr: "French", de: "German",
  es: "Spanish", pt: "Portuguese", ar: "Arabic", zh: "Chinese", ja: "Japanese",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AVAILABLE_MODULES = [
  { id: "HR", label: "HR & People", description: "Employees, leaves, payroll, onboarding" },
  { id: "CRM", label: "CRM & Sales", description: "Leads, deals, contacts, pipeline" },
  { id: "PROJECTS", label: "Projects", description: "Tasks, sprints, milestones" },
  { id: "FINANCE", label: "Finance", description: "Expenses, invoices, accounting" },
  { id: "INVENTORY", label: "Inventory", description: "Assets, stock, warehouses" },
  { id: "HELPDESK", label: "Helpdesk", description: "Support tickets and SLA" },
] as const;

const STEP_TITLES = [
  "Welcome",
  "Your profile",
  "Branding",
  "Working policies",
  "Invite team",
  "Module selection",
  "Review & launch",
];

type Invitee = { email: string; role: string };

type WizardData = {
  industry: string;
  companySize: string;
  country: string;
  website: string;
  name: string;
  logo: string;
  primaryColor: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  language: string;
  fiscalYearStart: number;
  invitees: Invitee[];
  enabledModules: string[];
};

const DEFAULT_DATA: WizardData = {
  industry: "",
  companySize: "",
  country: "",
  website: "",
  name: "",
  logo: "",
  primaryColor: "#2563eb",
  supportEmail: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  fiscalYearStart: 4,
  invitees: [],
  enabledModules: ["HR", "CRM", "PROJECTS"],
};

const DRAFT_KEY = "org-setup-draft";

function isInvitee(v: unknown): v is Invitee {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.email === "string" && typeof obj.role === "string";
}

function loadDraft(): WizardData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      industry: typeof p.industry === "string" ? p.industry : DEFAULT_DATA.industry,
      companySize: typeof p.companySize === "string" ? p.companySize : DEFAULT_DATA.companySize,
      country: typeof p.country === "string" ? p.country : DEFAULT_DATA.country,
      website: typeof p.website === "string" ? p.website : DEFAULT_DATA.website,
      name: typeof p.name === "string" ? p.name : DEFAULT_DATA.name,
      logo: typeof p.logo === "string" ? p.logo : DEFAULT_DATA.logo,
      primaryColor: typeof p.primaryColor === "string" ? p.primaryColor : DEFAULT_DATA.primaryColor,
      supportEmail: typeof p.supportEmail === "string" ? p.supportEmail : DEFAULT_DATA.supportEmail,
      timezone: typeof p.timezone === "string" ? p.timezone : DEFAULT_DATA.timezone,
      currency: typeof p.currency === "string" ? p.currency : DEFAULT_DATA.currency,
      language: typeof p.language === "string" ? p.language : DEFAULT_DATA.language,
      fiscalYearStart: typeof p.fiscalYearStart === "number" ? p.fiscalYearStart : DEFAULT_DATA.fiscalYearStart,
      invitees: Array.isArray(p.invitees) ? p.invitees.filter(isInvitee) : DEFAULT_DATA.invitees,
      enabledModules: Array.isArray(p.enabledModules)
        ? p.enabledModules.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.enabledModules,
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function saveDraft(current: WizardData, updates: Partial<WizardData>): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...updates }));
  } catch {}
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() => {
    const draft = loadDraft();
    if (!draft.name) {
      if (session?.user?.name) {
        draft.name = session.user.name;
      } else if (session?.user?.email) {
        const username = session.user.email.split("@")[0] ?? "";
        draft.name = username.charAt(0).toUpperCase() + username.slice(1).replace(/[._-]/g, " ");
      }
    }
    return draft;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newInviteeEmail, setNewInviteeEmail] = useState("");
  const [newInviteeRole, setNewInviteeRole] = useState("EMPLOYEE");

  const patch = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      saveDraft(prev, updates);
      return next;
    });
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handleAddInvitee = useCallback(() => {
    if (!newInviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInviteeEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (data.invitees.some((i) => i.email === newInviteeEmail)) {
      toast.error("Email already added");
      return;
    }
    patch({ invitees: [...data.invitees, { email: newInviteeEmail, role: newInviteeRole }] });
    setNewInviteeEmail("");
  }, [newInviteeEmail, newInviteeRole, data.invitees, patch]);

  const handleRemoveInvitee = useCallback((email: string) => {
    patch({ invitees: data.invitees.filter((i) => i.email !== email) });
  }, [data.invitees, patch]);

  const handleToggleModule = useCallback((id: string) => {
    const has = data.enabledModules.includes(id);
    patch({ enabledModules: has ? data.enabledModules.filter((m) => m !== id) : [...data.enabledModules, id] });
  }, [data.enabledModules, patch]);

  const handleSubmit = useCallback(async () => {
    if (data.enabledModules.length === 0) {
      toast.error("Select at least one module");
      setStep(6);
      return;
    }
    setIsSubmitting(true);
    try {
      const trimmedName = data.name.trim();
      const spaceIdx = trimmedName.indexOf(" ");
      const firstName = spaceIdx === -1 ? trimmedName : trimmedName.slice(0, spaceIdx);
      const lastName = spaceIdx === -1 ? "" : trimmedName.slice(spaceIdx + 1).trim();
      await apiClient.patch("/org/setup", {
        industry: data.industry,
        companySize: data.companySize,
        country: data.country,
        website: data.website || undefined,
        firstName,
        lastName,
        logo: data.logo || undefined,
        primaryColor: data.primaryColor,
        supportEmail: data.supportEmail || undefined,
        timezone: data.timezone,
        currency: data.currency,
        language: data.language,
        fiscalYearStart: data.fiscalYearStart,
        invitees: data.invitees,
        enabledModules: data.enabledModules,
      });
      clearDraft();
      setShowCelebration(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  const handleGoToDashboard = useCallback(() => {
    window.location.href = "/dashboard";
  }, []);

  const handleInviteeEmailKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddInvitee();
      }
    },
    [handleAddInvitee],
  );

  return (
    <div className="w-full max-w-lg relative">
      {showCelebration && <ConfettiOverlay durationMs={2200} onDone={handleGoToDashboard} />}

      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {step === 1
            ? `Welcome${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!`
            : STEP_TITLES[step - 1]}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label="Setup progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i < step ? "bg-blue-600" : "bg-slate-200",
              )}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">Tell us about your organization.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Industry *</Label>
                <Select onValueChange={(v) => patch({ industry: v })} value={data.industry}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Company size *</Label>
                <Select onValueChange={(v) => patch({ companySize: v })} value={data.companySize}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Country *</Label>
                <Select onValueChange={(v) => patch({ country: v })} value={data.country}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">
                  Website <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  value={data.website}
                  onChange={(e) => patch({ website: e.target.value })}
                  placeholder="https://acme.com"
                  className="h-10"
                />
              </div>
            </div>
            <Button
              className="w-full h-10 mt-2"
              onClick={() => {
                if (!data.industry || !data.companySize || !data.country) {
                  toast.error("Please fill in the required fields");
                  return;
                }
                goNext();
              }}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">A few details about you, the admin.</p>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Your name *</Label>
              <Input
                value={data.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Aditya Sharma"
                className="h-10"
                autoFocus
              />
            </div>
            <NavButtons
              onBack={goBack}
              onNext={() => {
                if (!data.name.trim()) {
                  toast.error("Please enter your name");
                  return;
                }
                goNext();
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">Customize how your workspace looks. All optional.</p>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">
                Logo URL <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={data.logo}
                onChange={(e) => patch({ logo: e.target.value })}
                placeholder="https://cdn.example.com/logo.png"
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.primaryColor}
                    onChange={(e) => patch({ primaryColor: e.target.value })}
                    className="h-10 w-10 rounded border cursor-pointer"
                    aria-label="Pick primary color"
                  />
                  <Input
                    value={data.primaryColor}
                    onChange={(e) => patch({ primaryColor: e.target.value })}
                    placeholder="#2563eb"
                    className="h-10 flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">
                  Support email <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  type="email"
                  value={data.supportEmail}
                  onChange={(e) => patch({ supportEmail: e.target.value })}
                  placeholder="support@acme.com"
                  className="h-10"
                />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">Set defaults for dates, currency, and fiscal year.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Timezone</Label>
                <Select onValueChange={(v) => patch({ timezone: v })} value={data.timezone}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Currency</Label>
                <Select onValueChange={(v) => patch({ currency: v })} value={data.currency}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Language</Label>
                <Select onValueChange={(v) => patch({ language: v })} value={data.language}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{LANGUAGE_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Fiscal year starts</Label>
                <Select
                  onValueChange={(v) => patch({ fiscalYearStart: parseInt(v, 10) })}
                  value={String(data.fiscalYearStart)}
                >
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Invite colleagues to join. They&apos;ll receive an email with a link to accept.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={newInviteeEmail}
                onChange={(e) => setNewInviteeEmail(e.target.value)}
                onKeyDown={handleInviteeEmailKeyDown}
                placeholder="colleague@company.com"
                className="h-9 flex-1"
              />
              <Select value={newInviteeRole} onValueChange={setNewInviteeRole}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ADMIN", "MANAGER", "EMPLOYEE", "HR", "FINANCE"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={handleAddInvitee} className="h-9 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {data.invitees.length > 0 && (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto" aria-label="Invited colleagues">
                {data.invitees.map((inv) => (
                  <li key={inv.email} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex-1 text-sm truncate">{inv.email}</span>
                    <Badge variant="secondary" className="text-[10px] h-4">{inv.role}</Badge>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvitee(inv.email)}
                      aria-label={`Remove ${inv.email}`}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <NavButtons onBack={goBack} onNext={goNext} skipLabel="Skip" />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">
              Select the modules your organization will use. You can change these later.
            </p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Module selection">
              {AVAILABLE_MODULES.map((m) => {
                const enabled = data.enabledModules.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="checkbox"
                    aria-checked={enabled}
                    onClick={() => handleToggleModule(m.id)}
                    className={cn(
                      "text-left p-3 rounded-xl border-2 transition-colors",
                      enabled
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[13px] font-semibold text-slate-900">{m.label}</span>
                      {enabled && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                  </button>
                );
              })}
            </div>
            <NavButtons
              onBack={goBack}
              onNext={() => {
                if (data.enabledModules.length === 0) {
                  toast.error("Select at least one module to continue");
                  return;
                }
                goNext();
              }}
            />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5">
            <p className="text-[13px] text-slate-500">Everything looks good? Launch your workspace.</p>
            <dl className="space-y-3 text-sm">
              <ReviewRow label="Industry" value={`${data.industry} · ${data.companySize}`} />
              <ReviewRow label="Country" value={data.country} />
              <ReviewRow label="Admin" value={data.name} />
              <ReviewRow label="Timezone" value={`${data.timezone} · ${data.currency}`} />
              <ReviewRow
                label="Invited"
                value={data.invitees.length > 0 ? `${data.invitees.length} colleague${data.invitees.length !== 1 ? "s" : ""}` : "None"}
              />
              <ReviewRow label="Modules" value={data.enabledModules.join(", ") || "None"} />
            </dl>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={goBack} className="flex-1 h-10">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 h-10 gap-2" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isSubmitting ? "Launching…" : "Launch workspace"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  skipLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  skipLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-10">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      {skipLabel && (
        <Button type="button" variant="ghost" onClick={onNext} className="h-10 px-4 text-muted-foreground">
          {skipLabel}
        </Button>
      )}
      <Button type="button" onClick={onNext} className="flex-1 h-10">
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-muted-foreground w-28 shrink-0 text-[12px]">{label}</dt>
      <dd className="flex-1 font-medium text-[13px] truncate">{value}</dd>
    </div>
  );
}
