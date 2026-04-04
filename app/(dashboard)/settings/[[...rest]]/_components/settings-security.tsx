"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ShieldCheck, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useChangePassword } from "@/lib/api/hooks/hr";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

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

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Monitor className="h-4 w-4" />;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

function parseDeviceName(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("edg")) return "Microsoft Edge";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  if (ua.includes("opera")) return "Opera";
  return "Browser";
}

/* ── Sessions Section ── */
function SessionsSection() {
  const { data: sessions, isLoading } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const handleRevokeOne = useCallback((sessionId: string) => {
    revokeOne.mutate(sessionId, {
      onSuccess: () => toast.success("Session revoked"),
      onError: () => toast.error("Failed to revoke session"),
    });
  }, [revokeOne]);

  const handleRevokeAll = useCallback(() => {
    revokeAll.mutate(undefined, {
      onSuccess: (data) => {
        const count = (data as { revokedCount?: number }).revokedCount ?? 0;
        toast.success(`Signed out ${count} other session${count !== 1 ? "s" : ""}`);
      },
      onError: () => toast.error("Failed to revoke sessions"),
    });
  }, [revokeAll]);

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Active sessions</p>
            <p className="text-[11px] text-muted-foreground">Manage where you are signed in.</p>
          </div>
        </div>
        {otherSessions.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={revokeAll.isPending}>
                {revokeAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign out all others"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out other sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately revoke {otherSessions.length} other session{otherSessions.length !== 1 ? "s" : ""}. Those devices will need to sign in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeAll}>Sign out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="h-px bg-border" />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <p className="text-[12px] text-muted-foreground text-center py-4">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
              <span className="text-muted-foreground flex-shrink-0">{getDeviceIcon(s.userAgent)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium truncate">{parseDeviceName(s.userAgent)}</p>
                  {s.isCurrent && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-300 text-emerald-600 bg-emerald-50">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}
                  Active {formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })}
                </p>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevokeOne(s.id)}
                  disabled={revokeOne.isPending}
                  aria-label="Revoke session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Password Change ── */
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
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 space-y-5">
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

      <SessionsSection />
    </div>
  );
}
