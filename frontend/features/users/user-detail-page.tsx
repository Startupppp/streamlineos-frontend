"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { useUser } from "@/hooks/api/users";
import { UserStatusBadge } from "./user-status-badge";
import { UserEditForm } from "./user-edit-form";
import { UserSessionsTab } from "./user-sessions-tab";
import { UserDevicesTab } from "./user-devices-tab";
import { UserActivityTab } from "./user-activity-tab";
import { UserLoginHistoryTab } from "./user-login-history-tab";
import { UserAuditTab } from "./user-audit-tab";
import { UserPreferencesTab } from "./user-preferences-tab";
import { UserMembershipSection } from "./user-membership-section";
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
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

interface UserDetailPageProps {
  userId: string;
}

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
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-8 w-full mb-4 rounded-md" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    </div>
  );
}

const TAB_ITEMS = [
  { value: "sessions", label: "Sessions" },
  { value: "devices", label: "Devices" },
  { value: "activity", label: "Activity" },
  { value: "login-history", label: "Logins" },
  { value: "audit", label: "Audit" },
  { value: "preferences", label: "Preferences" },
] as const;

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: user, isLoading, isError, refetch } = useUser(userId);

  const handleEditSuccess = useCallback(() => setIsEditing(false), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleStartEdit = useCallback(() => setIsEditing(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <PageWrapper
      title={isLoading ? "User" : (user?.name ?? user?.email ?? "User")}
      subtitle={user?.designation ?? undefined}
      backHref="/users"
      actions={
        user && !isEditing ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleStartEdit}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>
        ) : isEditing ? (
          <AnimatedIconButton
            icon={XIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleCancelEdit}
          >
            Cancel
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {isLoading ? (
        <ProfileSkeleton />
      ) : isError ? (
        <ErrorState
          title="Failed to load user"
          description="Could not load this user's details."
          onRetry={handleRetry}
        />
      ) : !user ? null : isEditing ? (
        <div className="max-w-2xl">
          <UserEditForm
            user={user}
            onSuccess={handleEditSuccess}
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? user.email}
                />
                <AvatarFallback className="text-sm font-semibold">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm leading-tight truncate">
                  {user.name ?? user.email}
                </p>
                {user.designation && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {user.designation}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5"
                  >
                    {user.role}
                  </Badge>
                  <UserStatusBadge isActive={user.isActive} />
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
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {user.bio}
                </p>
              </>
            )}

            {(user.linkedinUrl ||
              user.twitterUrl ||
              user.githubUrl ||
              user.websiteUrl) && (
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
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Emergency Contact
                  </p>
                  <p className="text-xs font-medium">
                    {user.emergencyContact.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({user.emergencyContact.relation})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.emergencyContact.phone}
                  </p>
                  {user.emergencyContact.email && (
                    <p className="text-xs text-muted-foreground">
                      {user.emergencyContact.email}
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />
            <UserMembershipSection userId={user.id} />
          </div>

          <div className="min-w-0">
            <Tabs defaultValue="sessions">
              <TabsList className="w-full justify-start bg-muted/50 rounded-md p-0.5 gap-0.5 flex-wrap">
                {TAB_ITEMS.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="text-xs px-2.5"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="sessions" className="mt-4">
                <UserSessionsTab userId={user.id} />
              </TabsContent>
              <TabsContent value="devices" className="mt-4">
                <UserDevicesTab userId={user.id} />
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <UserActivityTab userId={user.id} />
              </TabsContent>
              <TabsContent value="login-history" className="mt-4">
                <UserLoginHistoryTab userId={user.id} />
              </TabsContent>
              <TabsContent value="audit" className="mt-4">
                <UserAuditTab userId={user.id} />
              </TabsContent>
              <TabsContent value="preferences" className="mt-4">
                <UserPreferencesTab userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
