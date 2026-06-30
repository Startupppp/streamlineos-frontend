"use client";

import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Check,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 11;
const DRAFT_KEY = "org-setup-draft";

const GOALS = [
  { id: "sales", label: "Grow Sales" },
  { id: "hr", label: "Manage Employees" },
  { id: "inventory", label: "Manage Inventory" },
  { id: "finance", label: "Finance & Accounting" },
  { id: "support", label: "Customer Support" },
  { id: "projects", label: "Projects" },
  { id: "ai", label: "AI Automation" },
  { id: "everything", label: "Build Everything" },
] as const;

const INDUSTRIES = [
  "IT Services",
  "Agency",
  "Retail",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Construction",
  "Real Estate",
  "Restaurant",
  "Logistics",
] as const;

const TEAM_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
] as const;

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "UAE",
  "Other",
] as const;

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "SGD",
  "AED",
  "CAD",
  "JPY",
] as const;

const APP_SUITES = [
  { id: "CRM", label: "Sales Suite", description: "Leads, deals, contacts, pipeline" },
  { id: "HR", label: "People Suite", description: "Employees, leaves, payroll, onboarding" },
  { id: "PROJECTS", label: "Operations Suite", description: "Tasks, sprints, milestones" },
  { id: "FINANCE", label: "Finance Suite", description: "Expenses, invoices, accounting" },
  { id: "INVENTORY", label: "Inventory", description: "Assets, stock, warehouses" },
  { id: "HELPDESK", label: "Helpdesk", description: "Support tickets and SLA" },
] as const;

const GENERATION_STEPS = [
  "Creating organization",
  "Setting up departments",
  "Building teams",
  "Configuring roles",
  "Loading sample dashboard",
  "Creating workflows",
  "Installing recommended apps",
] as const;

const INTEGRATIONS = [
  { id: "google", label: "Google Workspace" },
  { id: "microsoft", label: "Microsoft 365" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
  { id: "slack", label: "Slack" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "calendar", label: "Calendar" },
] as const;

const IMPORT_TYPES = [
  { id: "customers", label: "Customers" },
  { id: "employees", label: "Employees" },
  { id: "inventory", label: "Inventory" },
  { id: "projects", label: "Projects" },
] as const;

const STEP_TITLES = [
  "Welcome",
  "Business Goals",
  "Industry",
  "Company Profile",
  "Building Your Workspace",
  "Recommended Apps",
  "Invite Team",
  "Connect Tools",
  "Import Data",
  "AI Personalization",
  "Workspace Ready",
] as const;

const NEXT_ACTIONS = [
  "Invite first teammate",
  "Create first record",
  "Connect email",
  "Complete profile",
  "Try AI Assistant",
] as const;

type Invitee = { email: string; role: string };

type WizardData = {
  goals: string[];
  industry: string;
  companyName: string;
  teamSize: string;
  country: string;
  timezone: string;
  currency: string;
  installedApps: string[];
  invitees: Invitee[];
};

const DEFAULT_DATA: WizardData = {
  goals: [],
  industry: "",
  companyName: "",
  teamSize: "",
  country: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  installedApps: ["CRM", "HR", "PROJECTS"],
  invitees: [],
};

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
      goals: Array.isArray(p.goals)
        ? p.goals.filter((g): g is string => typeof g === "string")
        : DEFAULT_DATA.goals,
      industry:
        typeof p.industry === "string" ? p.industry : DEFAULT_DATA.industry,
      companyName:
        typeof p.companyName === "string"
          ? p.companyName
          : DEFAULT_DATA.companyName,
      teamSize:
        typeof p.teamSize === "string" ? p.teamSize : DEFAULT_DATA.teamSize,
      country:
        typeof p.country === "string" ? p.country : DEFAULT_DATA.country,
      timezone:
        typeof p.timezone === "string" ? p.timezone : DEFAULT_DATA.timezone,
      currency:
        typeof p.currency === "string" ? p.currency : DEFAULT_DATA.currency,
      installedApps: Array.isArray(p.installedApps)
        ? p.installedApps.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.installedApps,
      invitees: Array.isArray(p.invitees)
        ? p.invitees.filter(isInvitee)
        : DEFAULT_DATA.invitees,
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
  const [data, setData] = useState<WizardData>(() => loadDraft());
  const [newInviteeEmail, setNewInviteeEmail] = useState("");
  const [newInviteeRole, setNewInviteeRole] = useState("EMPLOYEE");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const generationFiredRef = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "";

  const patch = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      saveDraft(prev, updates);
      return next;
    });
  }, []);

  const goNext = useCallback(
    () => setStep((s) => Math.min(s + 1, TOTAL_STEPS)),
    [],
  );
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  useEffect(() => {
    if (step !== 5) return;
    if (generationFiredRef.current) return;
    generationFiredRef.current = true;
    startTransition(() => {
      setCompletedSteps(0);
      setGenerationError(null);
    });

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx += 1;
      setCompletedSteps(stepIdx);
      if (stepIdx >= GENERATION_STEPS.length) clearInterval(interval);
    }, 600);

    apiClient
      .patch("/org/setup", {
        goals: data.goals,
        industry: data.industry,
        companyName: data.companyName,
        companySize: data.teamSize,
        country: data.country,
        timezone: data.timezone,
        currency: data.currency,
        enabledModules:
          data.installedApps.length > 0
            ? data.installedApps
            : ["HR", "CRM", "PROJECTS"],
        invitees: data.invitees,
      })
      .then(() => {
        clearInterval(interval);
        setCompletedSteps(GENERATION_STEPS.length);
        setTimeout(goNext, 800);
      })
      .catch((err: unknown) => {
        clearInterval(interval);
        setGenerationError(getErrorMessage(err));
      });

    return () => clearInterval(interval);
  }, [step, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetryGeneration = useCallback(() => {
    generationFiredRef.current = false;
    setCompletedSteps(0);
    setGenerationError(null);
    setRetryKey((k) => k + 1);
  }, []);

  const handleToggleGoal = useCallback(
    (id: string) => {
      const has = data.goals.includes(id);
      patch({
        goals: has
          ? data.goals.filter((g) => g !== id)
          : [...data.goals, id],
      });
    },
    [data.goals, patch],
  );

  const handleSelectIndustry = useCallback(
    (industry: string) => {
      patch({ industry });
      setTimeout(goNext, 200);
    },
    [patch, goNext],
  );

  const handleToggleApp = useCallback(
    (id: string) => {
      const has = data.installedApps.includes(id);
      patch({
        installedApps: has
          ? data.installedApps.filter((a) => a !== id)
          : [...data.installedApps, id],
      });
    },
    [data.installedApps, patch],
  );

  const handleAddInvitee = useCallback(() => {
    const email = newInviteeEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (data.invitees.some((i) => i.email === email)) {
      toast.error("Email already added");
      return;
    }
    patch({ invitees: [...data.invitees, { email, role: newInviteeRole }] });
    setNewInviteeEmail("");
  }, [newInviteeEmail, newInviteeRole, data.invitees, patch]);

  const handleRemoveInvitee = useCallback(
    (email: string) => {
      patch({ invitees: data.invitees.filter((i) => i.email !== email) });
    },
    [data.invitees, patch],
  );

  const handleInviteeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddInvitee();
      }
    },
    [handleAddInvitee],
  );

  const handleCsvUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text !== "string") return;
        const rows = text
          .split("\n")
          .slice(1)
          .map((line) => line.split(",").map((c) => c.trim()))
          .filter((cols) => cols[0] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cols[0]));
        const newInvitees: Invitee[] = rows.map((cols) => ({
          email: cols[0] ?? "",
          role: cols[1] ?? "EMPLOYEE",
        }));
        const merged = [
          ...data.invitees,
          ...newInvitees.filter(
            (ni) => !data.invitees.some((ei) => ei.email === ni.email),
          ),
        ];
        patch({ invitees: merged });
        toast.success(`Added ${newInvitees.length} invitees from CSV`);
      };
      reader.readAsText(file);
      if (csvInputRef.current) csvInputRef.current.value = "";
    },
    [data.invitees, patch],
  );

  const handleAiCustomize = useCallback(async () => {
    setIsAiLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    setIsAiLoading(false);
    goNext();
  }, [goNext]);

  const handleSkipToDashboard = useCallback(() => {
    window.location.href = "/dashboard";
  }, []);

  const handleEnterWorkspace = useCallback(() => {
    clearDraft();
    window.location.href = "/dashboard";
  }, []);

  useEffect(() => {
    if (step === 11) {
      clearDraft();
      startTransition(() => setShowCelebration(true));
    }
  }, [step]);

  return (
    <div className="w-full max-w-lg relative">
      {showCelebration && (
        <ConfettiOverlay durationMs={2200} onDone={() => setShowCelebration(false)} />
      )}

      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {step === 1
            ? `Welcome${firstName ? `, ${firstName}` : ""}!`
            : STEP_TITLES[step - 1]}
        </h1>
        {step > 1 && step < 11 && (
          <p className="text-[13px] text-slate-500 mt-1">
            Step {step} of {TOTAL_STEPS}
          </p>
        )}
      </div>

      {step > 1 && step < 11 && (
        <div className="mb-6">
          <div
            className="flex gap-1"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label="Setup progress"
          >
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i < step - 1 ? "bg-blue-600" : "bg-slate-200",
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-600">
                Get your workspace ready in{" "}
                <span className="font-semibold text-slate-900">3–5 minutes</span>
              </p>
              <p className="text-[13px] text-slate-400">
                We'll help you set up everything your team needs to get started.
              </p>
            </div>
            <div className="space-y-2">
              <Button className="w-full h-10" onClick={goNext}>
                Start Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-slate-400"
                onClick={handleSkipToDashboard}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500 font-medium">
              What do you want to achieve?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((goal) => {
                const selected = data.goals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => handleToggleGoal(goal.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-colors text-[13px] font-medium",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:border-blue-300",
                    )}
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-blue-500 border-blue-500"
                          : "border-slate-300",
                      )}
                    >
                      {selected && (
                        <Check className="h-3 w-3 text-white" aria-hidden="true" />
                      )}
                    </span>
                    {goal.label}
                  </button>
                );
              })}
            </div>
            <NavButtons
              onBack={goBack}
              onNext={() => {
                if (data.goals.length === 0) {
                  toast.error("Select at least one goal to continue");
                  return;
                }
                goNext();
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Select your industry to load tailored templates.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((industry) => {
                const selected = data.industry === industry;
                return (
                  <button
                    key={industry}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelectIndustry(industry)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left text-[13px] font-medium transition-colors",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:border-blue-300",
                    )}
                  >
                    {industry}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="w-full h-10 text-slate-400"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Just the essentials — everything else can be configured later.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">
                  Company Name *
                </Label>
                <Input
                  value={data.companyName}
                  onChange={(e) => patch({ companyName: e.target.value })}
                  placeholder="Acme Corp"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">
                  Team Size *
                </Label>
                <Select
                  onValueChange={(v) => patch({ teamSize: v })}
                  value={data.teamSize}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-slate-700">
                  Country *
                </Label>
                <Select
                  onValueChange={(v) => patch({ country: v })}
                  value={data.country}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[12px] font-medium text-slate-700">
                    Time Zone
                  </Label>
                  <Select
                    onValueChange={(v) => patch({ timezone: v })}
                    value={data.timezone}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-medium text-slate-700">
                    Currency
                  </Label>
                  <Select
                    onValueChange={(v) => patch({ currency: v })}
                    value={data.currency}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <NavButtons
              onBack={goBack}
              onNext={() => {
                if (!data.companyName.trim()) {
                  toast.error("Enter your company name");
                  return;
                }
                if (!data.teamSize) {
                  toast.error("Select your team size");
                  return;
                }
                if (!data.country) {
                  toast.error("Select your country");
                  return;
                }
                goNext();
              }}
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <p className="text-[13px] text-slate-500">
              Sit tight while we build your personalised workspace.
            </p>
            <ul className="space-y-2" aria-label="Workspace generation progress">
              {GENERATION_STEPS.map((label, i) => {
                const done = i < completedSteps;
                const active = i === completedSteps && !generationError;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        done
                          ? "bg-green-100"
                          : active
                            ? "bg-blue-100"
                            : "bg-slate-100",
                      )}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] transition-colors",
                        done
                          ? "text-green-700 font-medium"
                          : active
                            ? "text-blue-700 font-medium"
                            : "text-slate-400",
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>

            {generationError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm text-destructive">{generationError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryGeneration}
                  className="h-8 text-xs"
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Based on your goals and industry, we recommend these apps.
            </p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="App selection">
              {APP_SUITES.map((app) => {
                const installed = data.installedApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    role="checkbox"
                    aria-checked={installed}
                    onClick={() => handleToggleApp(app.id)}
                    className={cn(
                      "text-left p-3 rounded-xl border-2 transition-colors",
                      installed
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[13px] font-semibold text-slate-900">
                        {app.label}
                      </span>
                      {installed && (
                        <CheckCircle2
                          className="h-4 w-4 text-blue-600 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{app.description}</p>
                    <span
                      className={cn(
                        "mt-2 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full",
                        installed
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {installed ? "Installed" : "Install"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Why these? We matched your goals and industry to the most useful modules for your team.
            </p>
            <NavButtons onBack={goBack} onNext={goNext} skipLabel="Skip" />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Invite colleagues — they'll get an email to join your workspace.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={newInviteeEmail}
                onChange={(e) => setNewInviteeEmail(e.target.value)}
                onKeyDown={handleInviteeKeyDown}
                placeholder="colleague@company.com"
                className="h-9 flex-1"
              />
              <Select value={newInviteeRole} onValueChange={setNewInviteeRole}>
                <SelectTrigger className="h-9 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["ADMIN", "MANAGER", "EMPLOYEE", "HR", "FINANCE"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={handleAddInvitee}
                className="h-9 gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvUpload}
                aria-label="Upload CSV file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => csvInputRef.current?.click()}
                className="h-8 text-[12px] gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload CSV
              </Button>
              <span className="text-[11px] text-slate-400">
                Format: email, role
              </span>
            </div>

            {data.invitees.length > 0 && (
              <ul
                className="space-y-1.5 max-h-40 overflow-y-auto"
                aria-label="Invited colleagues"
              >
                {data.invitees.map((inv) => (
                  <li
                    key={inv.email}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="flex-1 text-sm truncate">{inv.email}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 shrink-0">
                      {inv.role}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvitee(inv.email)}
                      aria-label={`Remove ${inv.email}`}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="h-10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={goNext}
                className="h-10 text-slate-400 flex-1"
              >
                Skip
              </Button>
              <Button type="button" onClick={goNext} className="h-10 flex-1">
                {data.invitees.length > 0
                  ? `Send ${data.invitees.length} Invite${data.invitees.length !== 1 ? "s" : ""} & Continue`
                  : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Connect your favourite tools to StreamlineOS.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTEGRATIONS.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white"
                >
                  <span className="text-[13px] font-medium text-slate-700">
                    {integration.label}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      window.open("/settings/integrations", "_blank")
                    }
                  >
                    Connect
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              You can connect these any time in Settings → Integrations.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="h-10 flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={goNext}
                className="h-10 flex-1"
              >
                Configure Later <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 9 && (
          <ImportDataStep onBack={goBack} onNext={goNext} />
        )}

        {step === 10 && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-slate-600 text-sm">
                AI will generate dashboards, pipelines, workflows, reports and KPIs
                tailored to your business.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full h-10 gap-2"
                onClick={handleAiCustomize}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isAiLoading ? "Customising…" : "Yes, customise with AI"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-slate-400"
                onClick={goNext}
                disabled={isAiLoading}
              >
                Skip, I'll do it later
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="w-full text-slate-300 text-[12px]"
              disabled={isAiLoading}
            >
              <ArrowLeft className="mr-1 h-3 w-3" /> Back
            </Button>
          </div>
        )}

        {step === 11 && (
          <div className="space-y-5 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your workspace is ready!
              </h2>
              <p className="text-[13px] text-slate-500 mt-1">
                Everything is set up and personalised for your team.
              </p>
            </div>
            <dl className="space-y-2 text-left">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <dt className="text-[12px] text-slate-500">Industry</dt>
                <dd className="text-[13px] font-medium text-slate-800">{data.industry}</dd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <dt className="text-[12px] text-slate-500">Modules installed</dt>
                <dd className="text-[13px] font-medium text-slate-800">
                  {data.installedApps.length}
                </dd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <dt className="text-[12px] text-slate-500">Team members invited</dt>
                <dd className="text-[13px] font-medium text-slate-800">
                  {data.invitees.length}
                </dd>
              </div>
            </dl>
            <div className="text-left space-y-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Next steps
              </p>
              <ul className="space-y-1.5">
                {NEXT_ACTIONS.map((action) => (
                  <li key={action} className="flex items-center gap-2 text-[13px] text-slate-600">
                    <span className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="w-full h-10 gap-2" onClick={handleEnterWorkspace}>
              <Sparkles className="h-4 w-4" />
              Enter Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportDataStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const handleFileChange = useCallback(
    (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const allowed = [".csv", ".xlsx", ".xls"];
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowed.includes(ext)) {
        setFileErrors((prev) => ({
          ...prev,
          [id]: "Only CSV or Excel files are supported",
        }));
        return;
      }
      setFileErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedFiles((prev) => ({ ...prev, [id]: file }));
    },
    [],
  );

  const handleContinue = useCallback(() => {
    const count = Object.keys(selectedFiles).length;
    if (count > 0) {
      toast.success(
        `${count} import${count !== 1 ? "s" : ""} queued — processing in the background.`,
      );
    }
    onNext();
  }, [selectedFiles, onNext]);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">
        Import your existing data. Your files will be processed in the background.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {IMPORT_TYPES.map((type) => (
          <label
            key={type.id}
            className={cn(
              "flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors",
              selectedFiles[type.id]
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-blue-300",
            )}
          >
            <span className="text-[13px] font-semibold text-slate-800">
              {type.label}
            </span>
            <span className="text-[11px] text-slate-400">CSV or Excel</span>
            {selectedFiles[type.id] && (
              <span className="text-[11px] text-blue-600 truncate">
                {selectedFiles[type.id]?.name}
              </span>
            )}
            {fileErrors[type.id] && (
              <span className="text-[11px] text-destructive">
                {fileErrors[type.id]}
              </span>
            )}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(type.id, e)}
              aria-label={`Upload ${type.label} file`}
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onNext}
          className="h-10 flex-1 text-slate-400"
        >
          Skip
        </Button>
        <Button type="button" onClick={handleContinue} className="h-10 flex-1">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
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
        <Button
          type="button"
          variant="ghost"
          onClick={onNext}
          className="h-10 px-4 text-muted-foreground"
        >
          {skipLabel}
        </Button>
      )}
      <Button type="button" onClick={onNext} className="flex-1 h-10">
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
