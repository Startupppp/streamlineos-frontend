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
  const [role, setRole] = useState<string>(INVITE_ROLES[0] ?? "ADMIN");
  const [phase, setPhase] = useState<"form" | "pending" | "generating">("form");

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    if (
      data.invitees.some((i) => i.email.toLowerCase() === trimmed.toLowerCase())
    )
      return;
    onChangeInvitees([...data.invitees, { email: trimmed, role }]);
    setEmail("");
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

  if (phase === "generating") return <StepGeneration data={data} />;

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
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Invite teammates now, or skip and invite them later from Settings.
      </p>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="min-w-0 w-full flex-1 text-sm sm:h-10"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex min-w-0 gap-2 sm:w-auto sm:shrink-0">
          <Select value={role} onValueChange={setRole} disabled={isPending}>
            <SelectTrigger className="min-w-0 flex-1 text-sm sm:w-32 sm:flex-initial">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {INVITE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="w-11 shrink-0 sm:w-10"
            onClick={handleAdd}
            disabled={isPending}
            aria-label="Add invitee"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {data.invitees.length > 0 && (
        <ul className="min-w-0 space-y-1.5">
          {data.invitees.map((invitee, i) => (
            <motion.li
              key={invitee.email}
              initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2, ease: "easeOut" }}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/50 px-3 py-2"
            >
              <TruncatedText
                text={invitee.email}
                className="min-w-0 text-[13px]"
              />
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {invitee.role}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(invitee.email)}
                  disabled={isPending}
                  className="inline-flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:w-9"
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
