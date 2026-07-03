"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Rocket, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INVITE_ROLES } from "../lib/constants";
import type { Invitee, WizardData } from "../lib/types";
import { StepGeneration } from "./step-generation";

type StepInviteLaunchProps = {
  data: WizardData;
  onChangeInvitees: (invitees: Invitee[]) => void;
  onBack: () => void;
};

export function StepInviteLaunch({ data, onChangeInvitees, onBack }: StepInviteLaunchProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(INVITE_ROLES[0]);
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

  if (launching) {
    return <StepGeneration data={data} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Invite teammates now, or skip and invite them later from Settings.
      </p>

      <div className="flex gap-1.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="h-9 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-9 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {data.invitees.length > 0 && (
        <ul className="space-y-1">
          {data.invitees.map((invitee, i) => (
            <motion.li
              key={invitee.email}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <span className="text-[13px] truncate">{invitee.email}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">{invitee.role}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(invitee.email)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${invitee.email}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-background px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="h-9 px-3 text-sm">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <Button type="button" onClick={() => setLaunching(true)} className="flex-1 h-9 text-sm gap-1.5">
          <Rocket className="h-3.5 w-3.5" /> Build my workspace <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
