"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { RocketIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillingPlans } from "@/hooks/api/subscription";
import {
  DEFAULT_INVITE_ROLE,
  USER_INVITE_ROLES,
} from "@/lib/constants/user-invite-roles";
import { validateInviteEmail } from "../lib/invite-email";
import {
  defaultInviteModuleAccess,
  effectiveInviteModuleAccess,
  getInviteAccessError,
} from "../lib/setup-payload";
import type {
  Invitee,
  InviteeModuleAccess,
  OrgModuleKey,
  WizardData,
} from "../lib/wizard-data-schema";
import { MAX_ORG_SETUP_INVITEES } from "@/hooks/api/org-setup-schema";
import { InviteeAccessRow } from "./invitee-access-row";
import { StepGeneration } from "./step-generation";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepInviteLaunchProps = {
  data: WizardData;
  onBack: () => void;
  onChangeInvitees: (invitees: Invitee[]) => void;
  onSkip?: () => void;
};

export function StepInviteLaunch({
  data,
  onChangeInvitees,
  onBack,
  onSkip,
}: StepInviteLaunchProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(DEFAULT_INVITE_ROLE);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "pending" | "generating">("form");
  const { data: plansData } = useBillingPlans();

  const seatLimit =
    plansData?.plans.find((p) => p.id === plansData.trialPlan)?.maxEmployees ??
    null;
  const inviteLimit =
    seatLimit === null
      ? MAX_ORG_SETUP_INVITEES
      : Math.min(Math.max(seatLimit - 1, 0), MAX_ORG_SETUP_INVITEES);
  const atLimit = data.invitees.length >= inviteLimit;
  const selectedModules = [...new Set(data.modules)].sort((a, b) =>
    a === "build" ? -1 : b === "build" ? 1 : 0,
  );
  const enabledModuleKeys = new Set(selectedModules);
  const currentAccessError = getInviteAccessError(data);

  function handleAdd() {
    if (atLimit) return;
    const result = validateInviteEmail(email, data.invitees);
    if (!result.ok) {
      setInviteError(result.error);
      return;
    }
    const candidate: Invitee = {
      email: result.email,
      role,
      moduleAccess: defaultInviteModuleAccess(role, data.modules),
    };
    const next = [...data.invitees, candidate];
    const accessIssue = getInviteAccessError({ ...data, invitees: next });
    if (accessIssue) {
      setInviteError(accessIssue);
      return;
    }
    setInviteError(null);
    setAccessError(null);
    onChangeInvitees(next);
    setEmail("");
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAdd();
  }

  function handleRemove(target: string) {
    onChangeInvitees(data.invitees.filter((i) => i.email !== target));
    setInviteError(null);
    setAccessError(null);
  }

  function handleAccessChange(
    target: string,
    moduleKey: OrgModuleKey,
    standing: string,
  ) {
    const next = data.invitees.map((invitee) => {
      if (invitee.email !== target) return invitee;
      const remaining = effectiveInviteModuleAccess(invitee, data.modules).filter(
        (item) => item.moduleKey !== moduleKey,
      );
      const moduleAccess: InviteeModuleAccess[] =
        standing === "MEMBER" || standing === "ADMIN"
          ? [...remaining, { moduleKey, standing }]
          : remaining;
      return { ...invitee, moduleAccess };
    });
    const issue = getInviteAccessError({ ...data, invitees: next });
    if (issue) {
      setAccessError(issue);
      return;
    }
    setAccessError(null);
    onChangeInvitees(next);
  }

  function handleRemoveUnavailableAccess(target: string) {
    const next = data.invitees.map((invitee) =>
      invitee.email === target
        ? {
            ...invitee,
            moduleAccess: effectiveInviteModuleAccess(invitee, data.modules).filter(
              (item) => enabledModuleKeys.has(item.moduleKey),
            ),
          }
        : invitee,
    );
    setAccessError(null);
    onChangeInvitees(next);
  }

  function handleLaunch() {
    if (phase !== "form") return;
    const issue = getInviteAccessError(data);
    if (issue) {
      setAccessError(issue);
      return;
    }
    if (data.invitees.length > inviteLimit) {
      setAccessError(
        `Your current plan allows ${inviteLimit} setup invitation${inviteLimit === 1 ? "" : "s"}. Remove extra invitees or add seats later.`,
      );
      return;
    }
    setPhase("pending");
  }

  useEffect(() => {
    if (phase !== "pending") return;
    const id = window.setTimeout(() => setPhase("generating"), 120);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "generating") {
    return <StepGeneration data={data} onBackToProducts={onBack} />;
  }

  const isPending = phase === "pending";

  return (
    <StepBody
      footer={
        <NavButtons
          onBack={onBack}
          onNext={handleLaunch}
          nextLabel="Build my organization"
          nextIcon={RocketIcon}
          isPending={isPending}
          loadingText="Building organization…"
        />
      }
    >
      <p className="text-label leading-relaxed text-muted-foreground">
        Invite teammates now, or skip and invite them later from People → Invitations.
        {seatLimit !== null && (
          <>
            {" "}
            Your plan includes {seatLimit} seats, one of which is yours — you can
            invite up to {inviteLimit} {inviteLimit === 1 ? "person" : "people"}{" "}
            here.
          </>
        )}
      </p>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (inviteError) setInviteError(null);
          }}
          aria-invalid={!!inviteError}
          aria-describedby={inviteError ? "invite-email-error" : undefined}
          placeholder="teammate@company.com"
          className="min-w-0 h-9 w-full flex-1 text-sm"
          disabled={isPending || atLimit}
          onKeyDown={handleEmailKeyDown}
        />
        <div className="flex min-w-0 items-stretch gap-2 sm:w-auto sm:shrink-0">
          <Select value={role} onValueChange={setRole} disabled={isPending}>
            <SelectTrigger className="h-9 min-w-0 flex-1 text-sm sm:w-36 sm:flex-initial">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {USER_INVITE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9 shrink-0"
            onClick={handleAdd}
            disabled={isPending || atLimit}
            aria-label="Add invitee"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Members receive Build access when Build is selected. Choose any other
        product access per person below. Org Admins can access all enabled
        products and manage organization settings, so select that role deliberately.
      </p>

      {inviteError && (
        <p id="invite-email-error" role="alert" className="text-xs text-destructive">
          {inviteError}
        </p>
      )}

      {atLimit && (
        <p className="text-label leading-relaxed text-status-warning-ink">
          You&apos;ve used all {inviteLimit} invitations available during setup.
          {inviteLimit === MAX_ORG_SETUP_INVITEES
            ? " Remove one or invite more people later from People → Invitations."
            : " Remove one or add more seats later from Settings → Billing."}
        </p>
      )}

      {(accessError || currentAccessError) && (
        <p role="alert" className="text-xs text-destructive">
          {accessError ?? currentAccessError}
        </p>
      )}

      {onSkip && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={onSkip}
          disabled={isPending}
        >
          Skip for now
        </button>
      )}

      {data.invitees.length > 0 && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your team
        </p>
      )}

      {data.invitees.length > 0 && (
        <ul className="min-w-0 space-y-1">
          {data.invitees.map((invitee, i) => (
            <InviteeAccessRow
              key={invitee.email}
              invitee={invitee}
              index={i}
              selectedModules={selectedModules}
              isPending={isPending}
              onRemove={handleRemove}
              onAccessChange={handleAccessChange}
              onRemoveUnavailableAccess={handleRemoveUnavailableAccess}
            />
          ))}
        </ul>
      )}
    </StepBody>
  );
}
