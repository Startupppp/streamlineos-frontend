"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/api/users";
import { useCan } from "@/hooks/api/access";
import { UserEditForm } from "./user-edit-form";
import { UserSessionsTab } from "./user-sessions-tab";
import { UserPreferencesTab } from "./user-preferences-tab";
import { UserLoginHistoryTab } from "./user-login-history-tab";
import { UserAuditTab } from "./user-audit-tab";
import { UserProfileOverview } from "./user-profile-overview";
import { useEmploymentFacts } from "@/hooks/api/directory/employment";

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIVILEGED_TABS = new Set(["sessions", "login-history", "audit"]);

const TAB_ITEMS = [
  { value: "profile", label: "Overview" },
  { value: "sessions", label: "Sessions" },
  { value: "login-history", label: "Sign-ins" },
  { value: "audit", label: "Activity" },
  { value: "preferences", label: "Preferences" },
] as const;

const TAB_PANEL_CLASS = "mt-0 flex min-h-full flex-1 flex-col";

function ProfileSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

export function UserDetailSheet({ userId, open, onOpenChange }: UserDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const canManage = useCan("settings:organization:manage");
  const { data: user, isLoading } = useUser(userId ?? "", { enabled: !!userId && open });
  const { byUserId: employmentByUserId } = useEmploymentFacts(userId ? [userId] : []);
  const employment = userId ? employmentByUserId.get(userId) : undefined;
  const visibleTabs = canManage
    ? TAB_ITEMS
    : TAB_ITEMS.filter((tab) => !PRIVILEGED_TABS.has(tab.value));

  const handleEditSuccess = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="w-full sm:max-w-lg p-0 flex flex-col gap-0"
      >
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle className="text-base">User Details</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <SheetBody className="flex min-h-0 flex-1 flex-col px-6 py-5">
            <ProfileSkeleton />
          </SheetBody>
        )}

        {!isLoading && user && isEditing && canManage && (
          <UserEditForm
            user={user}
            onSuccess={handleEditSuccess}
            onCancel={handleCancelEditing}
          />
        )}

        {!isLoading && user && !(isEditing && canManage) && (
          <div className="flex min-h-0 flex-1 flex-col">
            <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="shrink-0 px-6 pt-2 pb-3">
                <TabsList className="w-full md:w-full shrink-0 gap-0.5 overflow-hidden rounded-md bg-muted/50 p-0.5">
                  {visibleTabs.map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="min-w-0 flex-1 basis-0 px-1 text-xs font-normal truncate"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <SheetBody className="px-6 pb-5 pt-2">
                <TabsContent value="profile" className={TAB_PANEL_CLASS}>
                  <UserProfileOverview
                    user={user}
                    employment={employment}
                    canManage={canManage}
                    onStartEditing={handleStartEditing}
                  />
                </TabsContent>

                {canManage && (
                  <>
                    <TabsContent value="sessions" className={TAB_PANEL_CLASS}>
                      <UserSessionsTab userId={user.id} />
                    </TabsContent>

                    <TabsContent value="login-history" className={TAB_PANEL_CLASS}>
                      <UserLoginHistoryTab userId={user.id} />
                    </TabsContent>

                    <TabsContent value="audit" className={TAB_PANEL_CLASS}>
                      <UserAuditTab userId={user.id} />
                    </TabsContent>
                  </>
                )}

                <TabsContent value="preferences" className={TAB_PANEL_CLASS}>
                  <UserPreferencesTab userId={user.id} />
                </TabsContent>
              </SheetBody>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
