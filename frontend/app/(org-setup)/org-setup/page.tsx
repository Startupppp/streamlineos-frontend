"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Plus, Trash2, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 9;

const INDUSTRIES = ["Technology", "Finance & Banking", "Healthcare", "Retail & E-commerce", "Manufacturing", "Education", "Real Estate", "Logistics & Supply Chain", "Marketing & Advertising", "Consulting", "Legal", "Media & Entertainment", "Hospitality & Travel", "Non-profit", "Other"] as const;
const COMPANY_SIZES = [{ value: "1-10", label: "1–10 employees" }, { value: "11-50", label: "11–50 employees" }, { value: "51-200", label: "51–200 employees" }, { value: "201-500", label: "201–500 employees" }, { value: "500+", label: "500+ employees" }] as const;
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Singapore", "UAE", "Other"] as const;
const TIMEZONES = ["Asia/Kolkata", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC"] as const;
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "SGD", "AED", "CAD", "JPY"] as const;
const LANGUAGES = ["en", "hi", "fr", "de", "es", "pt", "ar", "zh", "ja"] as const;
const LANGUAGE_LABELS: Record<string, string> = { en: "English", hi: "Hindi", fr: "French", de: "German", es: "Spanish", pt: "Portuguese", ar: "Arabic", zh: "Chinese", ja: "Japanese" };
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const COMMON_HOLIDAYS = [
  { name: "New Year's Day", date: "2026-01-01" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-03" },
  { name: "Good Friday", date: "2026-04-03" },
  { name: "Labour Day", date: "2026-05-01" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas Day", date: "2026-12-25" },
] as const;
const AVAILABLE_MODULES = [
  { id: "HR", label: "HR & People", description: "Employees, leaves, payroll, onboarding" },
  { id: "CRM", label: "CRM & Sales", description: "Leads, deals, contacts, pipeline" },
  { id: "PROJECTS", label: "Projects", description: "Tasks, sprints, milestones" },
  { id: "FINANCE", label: "Finance", description: "Expenses, invoices, accounting" },
  { id: "INVENTORY", label: "Inventory", description: "Assets, stock, warehouses" },
  { id: "HELPDESK", label: "Helpdesk", description: "Support tickets and SLA" },
] as const;

type DayHours = { open: string; close: string; enabled: boolean };
type BusinessHours = Record<string, DayHours>;
type Invitee = { email: string; role: string };

type WizardData = {
  companyName: string;
  industry: string;
  companySize: string;
  country: string;
  website: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  logo: string;
  primaryColor: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  language: string;
  fiscalYearStart: number;
  businessHours: BusinessHours;
  holidays: { name: string; date: string }[];
  invitees: Invitee[];
  enabledModules: string[];
};

const DEFAULT_BUSINESS_HOURS: BusinessHours = Object.fromEntries(
  DAYS.map((d) => [d, { open: "09:00", close: "18:00", enabled: !["saturday", "sunday"].includes(d) }]),
);

const DEFAULT_DATA: WizardData = {
  companyName: "",
  industry: "",
  companySize: "",
  country: "",
  website: "",
  firstName: "",
  lastName: "",
  jobTitle: "",
  phone: "",
  logo: "",
  primaryColor: "#2563eb",
  supportEmail: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  fiscalYearStart: 4,
  businessHours: DEFAULT_BUSINESS_HOURS,
  holidays: [],
  invitees: [],
  enabledModules: ["HR", "CRM", "PROJECTS"],
};

const STEP_TITLES = [
  "Welcome",
  "Your profile",
  "Branding",
  "Working policies",
  "Business hours",
  "Holidays",
  "Invite team",
  "Module selection",
  "Review & launch",
];

function loadDraft(): WizardData {
  try {
    const raw = localStorage.getItem("org-setup-draft");
    if (raw) return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch { }
  return DEFAULT_DATA;
}

function saveDraft(data: Partial<WizardData>) {
  try {
    const current = loadDraft();
    localStorage.setItem("org-setup-draft", JSON.stringify({ ...current, ...data }));
  } catch { }
}

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() => {
    const draft = loadDraft();
    if (session?.user) {
      const parts = session.user.name?.split(" ") ?? [];
      if (!draft.firstName && parts[0]) draft.firstName = parts[0];
      if (!draft.lastName && parts[1]) draft.lastName = parts[1];
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
      saveDraft(updates);
      return next;
    });
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const addInvitee = useCallback(() => {
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

  const removeInvitee = useCallback((email: string) => {
    patch({ invitees: data.invitees.filter((i) => i.email !== email) });
  }, [data.invitees, patch]);

  const toggleHoliday = useCallback((h: { name: string; date: string }) => {
    const exists = data.holidays.some((x) => x.date === h.date);
    patch({ holidays: exists ? data.holidays.filter((x) => x.date !== h.date) : [...data.holidays, h] });
  }, [data.holidays, patch]);

  const toggleModule = useCallback((id: string) => {
    const has = data.enabledModules.includes(id);
    patch({ enabledModules: has ? data.enabledModules.filter((m) => m !== id) : [...data.enabledModules, id] });
  }, [data.enabledModules, patch]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await apiClient.patch("/org/setup", { ...data, website: data.website || undefined, logo: data.logo || undefined, supportEmail: data.supportEmail || undefined });
      localStorage.removeItem("org-setup-draft");
      setShowCelebration(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  const goToDashboard = useCallback(() => {
    window.location.href = "/dashboard";
  }, []);

  return (
    <div className="w-full max-w-lg relative">
      {showCelebration && <ConfettiOverlay durationMs={2200} onDone={goToDashboard} />}

      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {step === 1 ? `Welcome${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!` : STEP_TITLES[step - 1]}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">Step {step} of {TOTAL_STEPS}</p>
      </div>

      <div className="mb-6">
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
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
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Company name *</Label>
              <Input value={data.companyName} onChange={(e) => patch({ companyName: e.target.value })} placeholder="Acme Inc." className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Industry *</Label>
                <Select onValueChange={(v) => patch({ industry: v })} value={data.industry}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Company size *</Label>
                <Select onValueChange={(v) => patch({ companySize: v })} value={data.companySize}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>{COMPANY_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Country *</Label>
                <Select onValueChange={(v) => patch({ country: v })} value={data.country}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Website</Label>
                <Input value={data.website} onChange={(e) => patch({ website: e.target.value })} placeholder="https://acme.com" className="h-10" />
              </div>
            </div>
            <Button
              className="w-full h-10 mt-2"
              onClick={() => {
                if (!data.companyName || !data.industry || !data.companySize || !data.country) {
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">First name *</Label>
                <Input value={data.firstName} onChange={(e) => patch({ firstName: e.target.value })} placeholder="Aditya" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Last name *</Label>
                <Input value={data.lastName} onChange={(e) => patch({ lastName: e.target.value })} placeholder="Sharma" className="h-10" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Job title *</Label>
              <Input value={data.jobTitle} onChange={(e) => patch({ jobTitle: e.target.value })} placeholder="CEO, Founder, HR Director…" className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Phone <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input type="tel" value={data.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+91 98765 43210" className="h-10" />
            </div>
            <NavButtons onBack={goBack} onNext={() => {
              if (!data.firstName || !data.lastName || !data.jobTitle) { toast.error("Please fill in the required fields"); return; }
              goNext();
            }} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">Customize how your workspace looks.</p>
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-slate-700">Logo URL <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={data.logo} onChange={(e) => patch({ logo: e.target.value })} placeholder="https://cdn.example.com/logo.png" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={data.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} className="h-10 w-10 rounded border cursor-pointer" />
                  <Input value={data.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} placeholder="#2563eb" className="h-10 flex-1 font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Support email <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input type="email" value={data.supportEmail} onChange={(e) => patch({ supportEmail: e.target.value })} placeholder="support@acme.com" className="h-10" />
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
                  <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Currency</Label>
                <Select onValueChange={(v) => patch({ currency: v })} value={data.currency}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Language</Label>
                <Select onValueChange={(v) => patch({ language: v })} value={data.language}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{LANGUAGE_LABELS[l]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">Fiscal year starts</Label>
                <Select onValueChange={(v) => patch({ fiscalYearStart: parseInt(v) })} value={String(data.fiscalYearStart)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
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
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">Set the hours your team works each day.</p>
            {DAYS.map((day) => {
              const hours = data.businessHours[day] ?? { open: "09:00", close: "18:00", enabled: true };
              return (
                <div key={day} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <Checkbox
                      checked={hours.enabled}
                      onCheckedChange={(checked) => patch({ businessHours: { ...data.businessHours, [day]: { ...hours, enabled: !!checked } } })}
                    />
                    <span className="text-[13px] font-medium text-slate-700">{DAY_LABELS[day]}</span>
                  </div>
                  {hours.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input type="time" value={hours.open} onChange={(e) => patch({ businessHours: { ...data.businessHours, [day]: { ...hours, open: e.target.value } } })} className="h-8 text-sm w-28" />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input type="time" value={hours.close} onChange={(e) => patch({ businessHours: { ...data.businessHours, [day]: { ...hours, close: e.target.value } } })} className="h-8 text-sm w-28" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
            <NavButtons onBack={goBack} onNext={goNext} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">Select holidays to add to your org calendar. You can edit these later.</p>
            <div className="space-y-2">
              {COMMON_HOLIDAYS.map((h) => {
                const checked = data.holidays.some((x) => x.date === h.date);
                return (
                  <label key={h.date} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox checked={checked} onCheckedChange={() => toggleHoliday(h)} />
                    <span className="flex-1 text-sm">{h.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{h.date}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.holidays.length} holiday{data.holidays.length !== 1 ? "s" : ""} selected
            </p>
            <NavButtons onBack={goBack} onNext={goNext} skipLabel="Skip" />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">Invite colleagues to join. They&apos;ll receive an email with a link to accept.</p>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={newInviteeEmail}
                onChange={(e) => setNewInviteeEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInvitee(); } }}
                placeholder="colleague@company.com"
                className="h-9 flex-1"
              />
              <Select value={newInviteeRole} onValueChange={setNewInviteeRole}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ADMIN", "MANAGER", "EMPLOYEE", "HR", "FINANCE"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={addInvitee} className="h-9 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {data.invitees.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.invitees.map((inv) => (
                  <div key={inv.email} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex-1 text-sm truncate">{inv.email}</span>
                    <Badge variant="secondary" className="text-[10px] h-4">{inv.role}</Badge>
                    <button type="button" onClick={() => removeInvitee(inv.email)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <NavButtons onBack={goBack} onNext={goNext} skipLabel="Skip" />
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">Select the modules your organization will use. You can change these later.</p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MODULES.map((m) => {
                const enabled = data.enabledModules.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModule(m.id)}
                    className={cn(
                      "text-left p-3 rounded-xl border-2 transition-colors",
                      enabled ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[13px] font-semibold text-slate-900">{m.label}</span>
                      {enabled && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                  </button>
                );
              })}
            </div>
            <NavButtons onBack={goBack} onNext={goNext} />
          </div>
        )}

        {step === 9 && (
          <div className="space-y-5">
            <p className="text-[13px] text-slate-500">Everything looks good? Launch your workspace.</p>
            <div className="space-y-3 text-sm">
              <ReviewRow label="Organization" value={data.companyName} />
              <ReviewRow label="Industry" value={`${data.industry} · ${data.companySize}`} />
              <ReviewRow label="Country" value={data.country} />
              <ReviewRow label="Admin" value={`${data.firstName} ${data.lastName} (${data.jobTitle})`} />
              <ReviewRow label="Timezone" value={`${data.timezone} · ${data.currency}`} />
              <ReviewRow label="Business hours" value={`${Object.values(data.businessHours).filter((h) => h.enabled).length} days/week`} />
              <ReviewRow label="Holidays" value={`${data.holidays.length} selected`} />
              <ReviewRow label="Invited" value={data.invitees.length > 0 ? `${data.invitees.length} colleague${data.invitees.length !== 1 ? "s" : ""}` : "None"} />
              <ReviewRow label="Modules" value={data.enabledModules.join(", ") || "None"} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={goBack} className="flex-1 h-10">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 h-10 gap-2" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isSubmitting ? "Launching…" : "Launch workspace"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, skipLabel }: { onBack: () => void; onNext: () => void; skipLabel?: string }) {
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
      <span className="text-muted-foreground w-28 shrink-0 text-[12px]">{label}</span>
      <span className="flex-1 font-medium text-[13px] truncate">{value}</span>
    </div>
  );
}
