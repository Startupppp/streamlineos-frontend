"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
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
import type { Invitee } from "../lib/types";
import { NavButtons } from "./nav-buttons";

type StepInviteTeamProps = {
  invitees: Invitee[];
  onChange: (invitees: Invitee[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepInviteTeam({ invitees, onChange, onBack, onNext }: StepInviteTeamProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(INVITE_ROLES[0]);

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    if (invitees.some((i) => i.email.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...invitees, { email: trimmed, role }]);
    setEmail("");
  }

  function handleRemove(target: string) {
    onChange(invitees.filter((i) => i.email !== target));
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

      {invitees.length > 0 && (
        <ul className="space-y-1">
          {invitees.map((invitee, i) => (
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

      <NavButtons onBack={onBack} onNext={onNext} nextLabel={invitees.length > 0 ? "Continue" : "Skip"} />
    </div>
  );
}
