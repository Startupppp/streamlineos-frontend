"use client";

import { X } from "lucide-react";
import { type PasswordStrength, PASSWORD_REQUIREMENTS } from "@/lib/password-utils";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  strength,
  showRequirements = false,
}: PasswordStrengthIndicatorProps) {
  const missingRequirements = PASSWORD_REQUIREMENTS.filter(({ key }) => !strength.checks[key]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
        <span
          className={`text-xs font-medium capitalize shrink-0 ${
            strength.level === "strong"
              ? "text-green-600"
              : strength.level === "good"
                ? "text-blue-600"
                : strength.level === "fair"
                  ? "text-yellow-600"
                  : "text-red-600"
          }`}
        >
          {strength.level}
        </span>
      </div>
      {showRequirements && missingRequirements.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {missingRequirements.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <X className="h-3 w-3 text-destructive/70 shrink-0" />
              <span className="text-xs text-destructive/90">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
