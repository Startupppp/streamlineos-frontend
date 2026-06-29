"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Mail, Smartphone, Monitor, Moon, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/api/hr/leaves-expenses";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "leaves", label: "Leave Requests", description: "Approvals, rejections, and new requests" },
  { key: "expenses", label: "Expense Claims", description: "Submitted, approved, or rejected expenses" },
  { key: "payroll", label: "Payroll", description: "Payslip ready and payment processed" },
  { key: "attendance", label: "Attendance", description: "Clock-in/out alerts and anomalies" },
  { key: "deals", label: "Deals", description: "Stage changes, wins, losses, and assignments" },
  { key: "leads", label: "Leads", description: "New leads assigned and follow-up reminders" },
  { key: "tasks", label: "Tasks & Projects", description: "Task assignments, deadlines, and updates" },
  { key: "hr", label: "HR Updates", description: "Resignations, terminations, and onboarding" },
  { key: "system", label: "System", description: "Security alerts and account changes" },
];

export default function NotificationPreferencesPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [initialized, setInitialized] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!prefs || initialized) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmailEnabled(prefs.emailEnabled ?? true);
    setPushEnabled(prefs.pushEnabled ?? true);
    setInAppEnabled(prefs.inAppEnabled ?? true);
    setSmsEnabled(prefs.smsEnabled ?? false);
    setQuietStart(prefs.quietHoursStart ?? "");
    setQuietEnd(prefs.quietHoursEnd ?? "");
    const cats: Record<string, boolean> = {};
    CATEGORIES.forEach(c => {
      cats[c.key] = prefs.categories?.[c.key] ?? true;
    });
    setCategories(cats);
    setInitialized(true);
  }, [prefs, initialized]);

  const handleInAppToggle = useCallback((val: boolean) => { setInAppEnabled(val); setDirty(true); }, []);
  const handleEmailToggle = useCallback((val: boolean) => { setEmailEnabled(val); setDirty(true); }, []);
  const handlePushToggle = useCallback((val: boolean) => { setPushEnabled(val); setDirty(true); }, []);
  const handleSmsToggle = useCallback((val: boolean) => { setSmsEnabled(val); setDirty(true); }, []);

  const handleQuietStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuietStart(e.target.value);
    setDirty(true);
  }, []);

  const handleQuietEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuietEnd(e.target.value);
    setDirty(true);
  }, []);

  const handleCategoryToggle = useCallback((key: string, val: boolean) => {
    setCategories(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (quietStart && quietEnd && quietStart === quietEnd) {
      toast.error("Quiet hours start and end time cannot be the same");
      return;
    }
    if ((quietStart && !quietEnd) || (!quietStart && quietEnd)) {
      toast.error("Set both a start and end time for quiet hours");
      return;
    }
    updatePrefs.mutate(
      {
        emailEnabled,
        pushEnabled,
        inAppEnabled,
        smsEnabled,
        quietHoursStart: quietStart || undefined,
        quietHoursEnd: quietEnd || undefined,
        categories,
      },
      {
        onSuccess: () => { toast.success("Notification preferences saved"); setDirty(false); },
        onError: () => toast.error("Failed to save preferences"),
      }
    );
  }, [emailEnabled, pushEnabled, inAppEnabled, smsEnabled, quietStart, quietEnd, categories, updatePrefs]);

  if (isLoading) {
    return (
      <PageWrapper title="Notification Preferences" subtitle="Choose how and when you receive notifications">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Notification Preferences"
      subtitle="Choose how and when you receive notifications"
      actions={
        <Button onClick={handleSave} disabled={!dirty || updatePrefs.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updatePrefs.isPending ? "Saving..." : "Save Changes"}
        </Button>
      }
    >
      <motion.div className="space-y-4 max-w-2xl" variants={staggerContainer} initial="hidden" animate="visible">

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">In-App Notifications</p>
                    <p className="text-xs text-muted-foreground">Notification bell in the sidebar</p>
                  </div>
                </div>
                <Switch checked={inAppEnabled} onCheckedChange={handleInAppToggle} aria-label="In-App Notifications" className="shrink-0" />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive notifications to your email address</p>
                  </div>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={handleEmailToggle} aria-label="Email Notifications" className="shrink-0" />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Browser and mobile push notifications</p>
                  </div>
                </div>
                <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} aria-label="Push Notifications" className="shrink-0" />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">SMS Notifications</p>
                    <p className="text-xs text-muted-foreground">Text message alerts for urgent events</p>
                  </div>
                </div>
                <Switch checked={smsEnabled} onCheckedChange={handleSmsToggle} aria-label="SMS Notifications" className="shrink-0" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4 text-blue-600" />
                Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Suppress non-urgent notifications during these hours. Urgent alerts (security, critical) will still be delivered.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-start">Start time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={quietStart}
                    onChange={handleQuietStartChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-end">End time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={quietEnd}
                    onChange={handleQuietEndChange}
                  />
                </div>
              </div>
              {quietStart && quietEnd && (
                <p className="text-xs text-muted-foreground mt-2">
                  Notifications suppressed from {quietStart} to {quietEnd}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                Notification Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map((cat, i) => (
                <CategoryRow
                  key={cat.key}
                  catKey={cat.key}
                  label={cat.label}
                  description={cat.description}
                  checked={categories[cat.key] ?? true}
                  index={i}
                  onToggle={handleCategoryToggle}
                />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}

interface CategoryRowProps {
  catKey: string;
  label: string;
  description: string;
  checked: boolean;
  index: number;
  onToggle: (key: string, val: boolean) => void;
}

function CategoryRow({ catKey, label, description, checked, index, onToggle }: CategoryRowProps) {
  const handleChange = useCallback((val: boolean) => onToggle(catKey, val), [catKey, onToggle]);
  return (
    <div>
      {index > 0 && <Separator className="mb-4" />}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={handleChange} aria-label={label} className="shrink-0" />
      </div>
    </div>
  );
}
