"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useChangePassword } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Helpers ── */
function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[@$!%*?&]/.test(pw)) s++;
  const level = s <= 2 ? 1 : s <= 4 ? 2 : s <= 5 ? 3 : 4;
  const colors = ["bg-red-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { level, color: colors[level - 1], label: labels[level - 1] };
}

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "8–15 characters", test: (pw) => pw.length >= 8 && pw.length <= 15 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  { label: "One special character (@$!%*?&)", test: (pw) => /[@$!%*?&]/.test(pw) },
];

function isPasswordValid(pw: string) {
  return RULES.every((r) => r.test(pw));
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={cn("h-9 text-sm pr-9", error && "border-destructive")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? "Hide" : "Show"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function SettingsSecurity() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const changePassword = useChangePassword();
  const strength = next ? getStrength(next) : null;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 &&
    isPasswordValid(next) &&
    next === confirm &&
    !changePassword.isPending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          setCurrent(""); setNext(""); setConfirm("");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to change password");
        },
      }
    );
  }, [canSubmit, current, next, changePassword]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Change password</p>
          <p className="text-[11px] text-muted-foreground">Use a unique, strong password.</p>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Fields */}
      <div className="space-y-4">
        <PasswordInput
          id="current-pw"
          label="Current password"
          value={current}
          onChange={setCurrent}
          placeholder="Your current password"
          autoComplete="current-password"
        />

        <PasswordInput
          id="new-pw"
          label="New password"
          value={next}
          onChange={setNext}
          placeholder="8–15 characters"
          maxLength={15}
          autoComplete="new-password"
        />

        {/* Strength meter */}
        {next.length > 0 && strength && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    l <= strength.level ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                {RULES.map((r) => (
                  <p
                    key={r.label}
                    className={cn(
                      "text-[11px] leading-snug",
                      r.test(next) ? "text-emerald-500" : "text-muted-foreground"
                    )}
                  >
                    {r.test(next) ? "✓" : "○"} {r.label}
                  </p>
                ))}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold self-start",
                  strength.level === 1 && "text-red-500",
                  strength.level === 2 && "text-amber-500",
                  strength.level >= 3 && "text-emerald-500"
                )}
              >
                {strength.label}
              </span>
            </div>
          </div>
        )}

        <PasswordInput
          id="confirm-pw"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          error={mismatch ? "Passwords do not match" : undefined}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-8 px-4 text-xs"
        >
          {changePassword.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Changing…</>
          ) : (
            "Update password"
          )}
        </Button>
      </div>
    </div>
  );
}
