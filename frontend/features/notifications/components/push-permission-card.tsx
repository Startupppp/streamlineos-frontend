"use client";

import { BellIcon } from "@animateicons/react/lucide";
// @animateicons has no BellOff; §8 says anything absent falls back to static lucide.
import { BellOff } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { LoadingButton } from "@/components/ui/loading-button";
import { usePushSubscription } from "@/hooks/common/use-push-subscription";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useSession } from "next-auth/react";



/**
 * RT-003/004. The browser prompt is now asked here, from a button, next to an
 * explanation of what the user gets — never on page load. A denial is effectively
 * permanent on most browsers, so this is the one attempt each user ever gets and it
 * should happen when they have context, not when the shell mounts.
 *
 * The denied state is stated plainly rather than silently ignored: the app cannot
 * re-prompt, so the only honest thing to do is say so and point at browser settings.
 */
export function PushPermissionCard() {
  const { data: session } = useSession();
  const { permission, enable, isEnabling } = usePushSubscription(session?.user?.id);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  async function handleEnable() {
    try {
      const result = await enable();
      if (result === "granted") toast.success("Push notifications are on for this browser.");
      else if (result === "denied")
        toast.error("Your browser blocked notifications. You can change this in site settings.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <BellIcon ref={iconRef} size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Push notifications are on</p>
          <p className="text-sm text-muted-foreground">
            This browser will show alerts even when StreamlineOS is closed. Notifications never
            include message content — open the app to read them.
          </p>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <BellOff size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Push notifications are blocked</p>
          <p className="text-sm text-muted-foreground">
            Your browser blocked notifications for this site, and we cannot ask again from here.
            To turn them on, open your browser&apos;s site settings for StreamlineOS and allow
            notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0" {...hoverHandlers}>
        <BellIcon ref={iconRef} size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Turn on push notifications</p>
          <p className="text-sm text-muted-foreground">
            Get alerted about mentions, approvals and assignments even when StreamlineOS is closed.
            Alerts never include message content — you open the app to read them.
          </p>
        </div>
      </div>
      <LoadingButton isPending={isEnabling} onClick={handleEnable} className="w-full sm:w-auto">
        Enable
      </LoadingButton>
    </div>
  );
}
