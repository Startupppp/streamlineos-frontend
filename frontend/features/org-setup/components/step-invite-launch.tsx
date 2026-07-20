"use client";

import { useState } from "react";
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
import type { Invitee, WizardData } from "../lib/types";
import { TruncatedText } from "@/components/ui/truncated-text";
import { StepGeneration } from "./step-generation";
import { NavButtons } from "./nav-buttons";

type StepInviteLaunchProps = {
  data: WizardData;
  onChangeInvitees: (invitees: Invitee[]) => void;
  onBack: () => void;
};

export function StepInviteLaunch({ data, onChangeInvitees, onBack }: StepInviteLaunchProps) {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(INVITE_ROLES[0] ?? "ADMIN");
  const [launching, setLaunching] = useState(false);

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    if (data.invitees.some((i) => i.email.toLowerCase() === trimmed.toLowerCase())) return;
    onChangeInvitees([...data.invitees, { email: trimmed, role }]);
    setEmail("");
  }

  function handleRemove(target: string) {
    onChangeInvitees(data.invitees.filter((i) => i.email !== target));
  }

  function handleLaunch() {
    setLaunching(true);
  }

  if (launching) {
    return <StepGeneration data={data} />;
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Invite teammates now, or skip and invite them later from Settings.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex gap-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="flex-1 text-sm sm:w-28 sm:flex-initial">
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
            className="h-9 w-9 shrink-0"
            onClick={handleAdd}
            aria-label="Add invitee"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {data.invitees.length > 0 && (
        <ul className="space-y-1.5">
          {data.invitees.map((invitee, i) => (
            <motion.li
              key={invitee.email}
              initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/50 px-3 py-2"
            >
              <TruncatedText text={invitee.email} className="text-[13px]" />
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{invitee.role}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(invitee.email)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${invitee.email}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <NavButtons
        onBack={onBack}
        onNext={handleLaunch}
        nextLabel="Build my workspace"
        nextIcon={RocketIcon}
      />
    </div>
  );
}
