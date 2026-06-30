"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, Upload, X } from "lucide-react";
import type { Invitee } from "../_lib/types";

type StepInviteProps = {
  invitees: Invitee[];
  onAdd: (inv: Invitee) => void;
  onRemove: (email: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE", "HR", "FINANCE"];

export function StepInvite({ invitees, onAdd, onRemove, onBack, onNext }: StepInviteProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (invitees.some((i) => i.email === trimmed)) {
      toast.error("Email already added");
      return;
    }
    onAdd({ email: trimmed, role });
    setEmail("");
  }, [email, role, invitees, onAdd]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  }

  const handleCsvUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text !== "string") return;
        const rows = text.split("\n").slice(1)
          .map((line) => line.split(",").map((c) => c.trim()))
          .filter((cols) => cols[0] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cols[0]));
        const newInvitees: Invitee[] = rows.map((cols) => ({
          email: cols[0] ?? "",
          role: cols[1] ?? "EMPLOYEE",
        }));
        const fresh = newInvitees.filter((ni) => !invitees.some((ei) => ei.email === ni.email));
        fresh.forEach((inv) => onAdd(inv));
        toast.success(`Added ${fresh.length} invitees from CSV`);
      };
      reader.readAsText(file);
      if (csvInputRef.current) csvInputRef.current.value = "";
    },
    [invitees, onAdd],
  );

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Colleagues will get an email invitation to join.
      </p>

      <div className="flex items-center gap-1.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="colleague@company.com"
          className="h-9 text-sm flex-1"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-9 text-sm w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleAdd} className="h-9 w-9 p-0 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} aria-label="Upload CSV" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => csvInputRef.current?.click()}
          className="h-8 text-[12px] gap-1"
        >
          <Upload className="h-3 w-3" /> Import CSV
        </Button>
        <span className="text-[11px] text-muted-foreground">email, role</span>
      </div>

      <AnimatePresence>
        {invitees.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 max-h-36 overflow-y-auto"
            aria-label="Invited colleagues"
          >
            <AnimatePresence initial={false}>
              {invitees.map((inv) => (
                <motion.li
                  key={inv.email}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border"
                >
                  <span className="flex-1 text-[13px] text-foreground truncate">{inv.email}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 shrink-0 font-normal">{inv.role}</Badge>
                  <button
                    type="button"
                    onClick={() => onRemove(inv.email)}
                    aria-label={`Remove ${inv.email}`}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="flex gap-1.5 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="h-9 px-3 text-sm">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <Button type="button" variant="ghost" onClick={onNext} className="h-9 px-3 text-sm text-muted-foreground">
          Skip
        </Button>
        <Button type="button" onClick={onNext} className="flex-1 h-9 text-sm gap-1.5">
          {invitees.length > 0
            ? `Send ${invitees.length} Invite${invitees.length !== 1 ? "s" : ""}`
            : "Continue"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
