"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { HardDrive, Loader2, Mic, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useChatOrgSettings, useUpdateChatOrgSettings } from "@/hooks/api";
import type { ChatOrgSettings } from "@/types/chat";

const TABS = [
  { value: "settings", label: "Settings", icon: HardDrive },
  { value: "voice-video", label: "Voice", icon: Mic },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function resolveConfigTab(tab: string | null): TabValue {
  return tab === "voice-video" ? "voice-video" : "settings";
}

export function ChatConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const canManage = Boolean(session?.user?.isOrgOwner || session?.user?.isPlatformAdmin);

  const { data: settings, isLoading } = useChatOrgSettings();
  const updateSettings = useUpdateChatOrgSettings();

  const activeTab = resolveConfigTab(searchParams.get("tab"));

  useEffect(() => {
    if (searchParams.get("tab") === "notifications") {
      router.replace("/chat/configuration?tab=settings");
    }
  }, [searchParams, router]);

  const [draft, setDraft] = useState<ChatOrgSettings | null>(null);
  const [syncedSettings, setSyncedSettings] = useState<ChatOrgSettings | null>(null);

  if (settings && settings !== syncedSettings) {
    setSyncedSettings(settings);
    setDraft(settings);
  }

  const handleSelectTab = (tab: TabValue) => {
    router.replace(`/chat/configuration?tab=${tab}`);
  };

  const isDirty = draft && settings && JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings.mutateAsync({
        defaultNotificationPreference: draft.defaultNotificationPreference,
        maxAttachmentSizeMb: draft.maxAttachmentSizeMb,
        maxHuddleParticipants: draft.maxHuddleParticipants,
      });
      toast.success("Chat settings updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      <div className="w-56 shrink-0 border-r border-border/30 py-4 px-2">
        <p className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Configuration
        </p>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleSelectTab(tab.value)}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
              activeTab === tab.value
                ? "bg-blue-500/10 text-blue-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl">
        {!canManage && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700">
              You can view chat settings, but only org owners and admins can change them.
            </p>
          </div>
        )}

        {isLoading || !draft ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : activeTab === "settings" ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-bold mb-1">Settings</h2>
              <p className="text-[12px] text-muted-foreground">
                General limits that apply to every conversation in your organization.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                Max attachment size (MB)
              </Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={draft.maxAttachmentSizeMb}
                disabled={!canManage}
                onChange={(e) =>
                  setDraft({ ...draft, maxAttachmentSizeMb: Number(e.target.value) })
                }
                className="max-w-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Files larger than this are rejected when sent in a message.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-bold mb-1">Voice</h2>
              <p className="text-[12px] text-muted-foreground">
                Limits for huddles across your organization.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Max participants per call
              </Label>
              <Input
                type="number"
                min={2}
                max={500}
                value={draft.maxHuddleParticipants}
                disabled={!canManage}
                onChange={(e) =>
                  setDraft({ ...draft, maxHuddleParticipants: Number(e.target.value) })
                }
                className="max-w-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Once a call reaches this many active participants, further join attempts are
                rejected.
              </p>
            </div>
          </div>
        )}

        {canManage && draft && (
          <div className="mt-8 pt-4 border-t border-border/30">
            <Button onClick={handleSave} disabled={!isDirty || updateSettings.isPending} className="h-9">
              {updateSettings.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
