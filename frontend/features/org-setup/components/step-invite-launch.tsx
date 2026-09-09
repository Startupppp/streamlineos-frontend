"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
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
import { INVITE_ROLES } from "../lib/constants";
import { useBillingPlans } from "@/hooks/api/subscription";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import type { Invitee, WizardData } from "../lib/wizard-data-schema";
import { TruncatedText } from "@/components/ui/truncated-text";
import { StepGeneration } from "./step-generation";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepInviteLaunchProps = {
  data: WizardData;
  onBack: () => void;
  onChangeInvitees: (invitees: Invitee[]) => void;
};

export function StepInviteLaunch({
  data,
  onChangeInvitees,
  onBack,
}: StepInviteLaunchProps) {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(INVITE_ROLES[0] ?? "ORG_ADMIN");
  const [phase, setPhase] = useState<"form" | "pending" | "generating">("form");
  const { data: plansData } = useBillingPlans();

  const seatLimit =
    plansData?.plans.find((p) => p.id === plansData.trialPlan)?.maxEmployees ??
    null;
  const inviteLimit = seatLimit === null ? null : Math.max(seatLimit - 1, 0);
  const atLimit = inviteLimit !== null && data.invitees.length >= inviteLimit;

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    if (atLimit) return;
    if (
      data.invitees.some((i) => i.email.toLowerCase() === trimmed.toLowerCase())
    )
      return;
    onChangeInvitees([...data.invitees, { email: trimmed, role }]);
    setEmail("");
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAdd();
  }

  function handleRemove(target: string) {
    onChangeInvitees(data.invitees.filter((i) => i.email !== target));
  }

  function handleLaunch() {
    if (phase !== "form") return;
    setPhase("pending");
  }

  useEffect(() => {
    if (phase !== "pending") return;
    const id = window.setTimeout(() => setPhase("generating"), 120);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "generating") {
    return <StepGeneration data={data} />;
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
        {inviteLimit !== null && (
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
          onChange={(e) => setEmail(e.target.value)}
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
              {INVITE_ROLES.map((roleValue) => (
                <SelectItem key={roleValue} value={roleValue}>
                  {formatRoleLabel(roleValue)}
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

      {atLimit && (
        <p className="text-label leading-relaxed text-status-warning-ink">
          You&apos;ve used all {inviteLimit} invitations available on your plan.
          Remove one to invite someone else, or add more seats later from
          Settings → Billing.
        </p>
      )}

      {data.invitees.length > 0 && (
        <ul className="min-w-0 space-y-1">
          {data.invitees.map((invitee, i) => (
            <motion.li
              key={invitee.email}
              initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2, ease: "easeOut" }}
              className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card pl-2.5 pr-0"
            >
              <TruncatedText
                text={invitee.email}
                className="min-w-0 text-label font-semibold leading-none text-foreground"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatRoleLabel(invitee.role)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(invitee.email)}
                  disabled={isPending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                  aria-label={`Remove ${invitee.email}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </StepBody>
  );
}
