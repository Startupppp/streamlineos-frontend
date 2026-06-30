"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { X, Plus, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useInviteUser } from "@/hooks/api/organization";

interface InviteRow {
  id: string;
  email: string;
  role: string;
}

const ROLES = ["admin", "manager", "member", "viewer"];

interface InviteStepProps {
  onNext: (sent: number) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function InviteStep({ onNext, onSkip, onBack }: InviteStepProps) {
  const [rows, setRows] = useState<InviteRow[]>(() => [{ id: crypto.randomUUID(), email: "", role: "member" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inviteUser = useInviteUser();

  function handleAddRow() {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), email: "", role: "member" }]);
  }

  function handleRemoveRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleEmailChange(id: string, value: string) {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, email: value } : row));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleRoleChange(id: string, value: string) {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, role: value } : row));
  }

  function handleCsvUploadClick() {
    fileInputRef.current?.click();
  }

  function handleCsvFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<{ email: string; role: string }>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data
          .filter((row) => row.email && row.email.includes("@"))
          .map((row) => ({
            id: crypto.randomUUID(),
            email: row.email.trim(),
            role: ROLES.includes(row.role?.trim()) ? row.role.trim() : "member",
          }));
        if (parsed.length === 0) {
          toast.error("No valid emails found in CSV. Expected columns: email, role");
          return;
        }
        setRows((prev) => {
          const existing = prev.filter((r) => r.email.trim());
          return [...existing, ...parsed];
        });
        toast.success(`Loaded ${parsed.length} emails from CSV`);
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
    e.target.value = "";
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    rows.forEach((row) => {
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        newErrors[row.id] = "Invalid email address";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSend() {
    if (!validate()) return;
    const valid = rows.filter((r) => r.email.trim());
    if (valid.length === 0) {
      onNext(0);
      return;
    }
    setIsSending(true);
    let sent = 0;
    for (const row of valid) {
      try {
        await inviteUser.mutateAsync({ email: row.email, role: row.role });
        sent++;
      } catch {
        toast.error(`Failed to invite ${row.email}`);
      }
    }
    setIsSending(false);
    if (sent > 0) {
      toast.success(`${sent} invite${sent > 1 ? "s" : ""} sent successfully`);
    }
    onNext(sent);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Invite your team</h2>
        <p className="text-sm text-muted-foreground">
          Add teammates by email. They&apos;ll receive an invitation to join your workspace.
        </p>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.id} className="flex gap-2 items-start">
            <div className="flex-1 space-y-0.5">
              <Input
                placeholder="email@example.com"
                type="email"
                value={row.email}
                onChange={(e) => handleEmailChange(row.id, e.target.value)}
                className={errors[row.id] ? "border-destructive" : ""}
                aria-invalid={Boolean(errors[row.id])}
              />
              {errors[row.id] && (
                <p className="text-xs text-destructive">{errors[row.id]}</p>
              )}
            </div>
            <Select value={row.role} onValueChange={(v) => handleRoleChange(row.id, v)}>
              <SelectTrigger className="w-[110px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => handleRemoveRow(row.id)}
                aria-label="Remove row"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} className="flex-1">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleCsvUploadClick} className="flex-1">
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleCsvFileChange}
          aria-hidden
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleSend} disabled={isSending} className="flex-1">
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ChevronRight className="h-4 w-4 ml-1 order-last" />
          )}
          {isSending ? "Sending…" : "Send Invites"}
        </Button>
      </div>
    </div>
  );
}
