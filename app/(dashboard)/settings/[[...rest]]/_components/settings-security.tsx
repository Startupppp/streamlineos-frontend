"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useChangePassword } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

function PasswordStrengthMeter({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  const level = score <= 2 ? 1 : score <= 4 ? 2 : score <= 5 ? 3 : 4;
  const label =
    level <= 1 ? "Weak" : level <= 2 ? "Medium" : level <= 3 ? "Strong" : "Very Strong";
  const barColor =
    level <= 1
      ? "bg-red-500"
      : level <= 2
        ? "bg-yellow-500"
        : level <= 3
          ? "bg-green-500"
          : "bg-emerald-500";
  const textColor =
    level <= 1 ? "text-red-500" : level <= 2 ? "text-yellow-500" : "text-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={`h-1.5 flex-1 rounded-full transition-colors ${l <= level ? barColor : "bg-muted"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${textColor}`}>{label}</p>
    </div>
  );
}

function PasswordRules({ password }: { password: string }) {
  const rules: { label: string; met: boolean }[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At most 15 characters", met: password.length <= 15 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
    { label: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(password) },
  ];

  return (
    <div className="space-y-1 text-xs">
      {rules.map(({ label, met }) => (
        <p key={label} className={met ? "text-emerald-500" : "text-muted-foreground"}>
          {met ? "✓" : "○"} {label}
        </p>
      ))}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  show: boolean;
  onToggleShow: () => void;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  show,
  onToggleShow,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function SettingsSecurity() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePassword = useChangePassword();

  const passwordValid =
    newPassword.length >= 8 &&
    newPassword.length <= 15 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    /[@$!%*?&]/.test(newPassword);

  const handleChangePassword = useCallback(() => {
    if (!newPassword || !currentPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to change password");
        },
      }
    );
  }, [currentPassword, newPassword, confirmPassword, changePassword]);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Change Password</CardTitle>
        <CardDescription>
          Update your account password. Use a strong, unique password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PasswordField
          id="current-password"
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Enter current password"
          show={showCurrentPassword}
          onToggleShow={() => setShowCurrentPassword((v) => !v)}
        />

        <div className="space-y-2">
          <PasswordField
            id="new-password"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="8–15 characters"
            maxLength={15}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((v) => !v)}
          />
          {newPassword && <PasswordStrengthMeter password={newPassword} />}
          {newPassword && <PasswordRules password={newPassword} />}
        </div>

        <div className="space-y-2">
          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            show={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword((v) => !v)}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleChangePassword}
            disabled={
              changePassword.isPending ||
              !currentPassword ||
              !passwordValid ||
              newPassword !== confirmPassword
            }
          >
            {changePassword.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
