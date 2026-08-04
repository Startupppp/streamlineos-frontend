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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/api/users";
import { useCan } from "@/hooks/api/access";
import { UserStatusBadge } from "./user-status-badge";
import { UserEditForm } from "./user-edit-form";
import { UserSessionsTab } from "./user-sessions-tab";
import { UserPreferencesTab } from "./user-preferences-tab";
import { UserLoginHistoryTab } from "./user-login-history-tab";
import { UserMembershipSection } from "./user-membership-section";
import { UserModuleAccessSection } from "./user-module-access-section";
import { UserAccessLinksSection } from "./user-access-links-section";
import { UserAuditTab } from "./user-audit-tab";
import { formatRoleLabel } from "./user-invite-roles";
import {
  Mail,
  Phone,
  Briefcase,
  Pencil,
  Linkedin,
  Twitter,
  Github,
  Globe,
} from "lucide-react";

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

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

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
              <div className="shrink-0 px-6 pt-5">
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
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-14 w-14 shrink-0">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
                        <AvatarFallback className="text-sm font-semibold">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-tight truncate">
                              {user.name ?? user.email}
                            </p>
                            {user.designation && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {user.designation}
                              </p>
                            )}
                          </div>
                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 text-xs"
                              onClick={handleStartEditing}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {formatRoleLabel(user.role)}
                          </Badge>
                          <UserStatusBadge
                            isActive={user.userStatus ? user.userStatus === "active" : user.isActive}
                            isDeleted={user.userStatus === "archived"}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-foreground truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2.5 text-xs">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{user.phone}</span>
                        </div>
                      )}
                      {user.designation && (
                        <div className="flex items-center gap-2.5 text-xs">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{user.designation}</span>
                        </div>
                      )}
                    </div>

                    {user.bio && (
                      <>
                        <Separator />
                        <p className="text-xs text-muted-foreground leading-relaxed">{user.bio}</p>
                      </>
                    )}

                    {(user.linkedinUrl || user.twitterUrl || user.githubUrl || user.websiteUrl) && (
                      <>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          {user.linkedinUrl && (
                            <a
                              href={user.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                              LinkedIn
                            </a>
                          )}
                          {user.twitterUrl && (
                            <a
                              href={user.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Twitter className="h-3.5 w-3.5" />
                              Twitter
                            </a>
                          )}
                          {user.githubUrl && (
                            <a
                              href={user.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Github className="h-3.5 w-3.5" />
                              GitHub
                            </a>
                          )}
                          {user.websiteUrl && (
                            <a
                              href={user.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Website
                            </a>
                          )}
                        </div>
                      </>
                    )}

                    {user.emergencyContact && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emergency Contact</p>
                          <div className="space-y-1 text-xs">
                            <p className="font-medium">{user.emergencyContact.name} <span className="font-normal text-muted-foreground">({user.emergencyContact.relation})</span></p>
                            <p className="text-muted-foreground">{user.emergencyContact.phone}</p>
                            {user.emergencyContact.email && <p className="text-muted-foreground">{user.emergencyContact.email}</p>}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />
                    <UserMembershipSection userId={user.id} />

                    <Separator />
                    <UserModuleAccessSection
                      userId={user.id}
                      isMemberActive={
                        user.userStatus
                          ? user.userStatus === "active"
                          : user.isActive
                      }
                    />

                    <Separator />
                    <UserAccessLinksSection userId={user.id} />
                  </div>
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
