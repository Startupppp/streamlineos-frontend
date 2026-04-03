"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Monitor, Rows3 } from "lucide-react";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr";

interface PrefRowProps {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}

function PrefRow({ id, icon: Icon, label, description, checked, onCheckedChange, disabled }: PrefRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <Label htmlFor={id} className="text-[13px] font-medium text-foreground cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export function SettingsPreferences() {
  const [compactView, setCompactView] = useState(false);

  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const emailEnabled = prefs?.emailNotifications ?? true;
  const leaveEnabled = prefs?.leaveReminders ?? true;
  const projectEnabled = prefs?.projectUpdates ?? true;

  const handleCompactToggle = (checked: boolean) => {
    setCompactView(checked);
    document.documentElement.classList.toggle("compact", checked);
    toast.success(checked ? "Compact view enabled" : "Compact view disabled");
  };

  const handlePrefUpdate = (field: string, value: boolean) => {
    updatePrefs.mutate(
      { [field]: value },
      { onError: () => toast.error("Failed to save preference") }
    );
  };

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
      <PrefRow
        id="compact-view"
        icon={Rows3}
        label="Compact view"
        description="Use a denser layout for tables and lists."
        checked={compactView}
        onCheckedChange={handleCompactToggle}
      />
      <PrefRow
        id="email-notifications"
        icon={Monitor}
        label="Email notifications"
        description="Receive important updates and alerts via email."
        checked={emailEnabled}
        onCheckedChange={(v) => handlePrefUpdate("emailNotifications", v)}
        disabled={updatePrefs.isPending}
      />
    </div>
  );
}
