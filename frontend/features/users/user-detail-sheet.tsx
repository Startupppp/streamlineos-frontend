"use client";

import { useState } from "react";
import {
  Sheet,
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
import { UserStatusBadge } from "./user-status-badge";
import { UserEditForm } from "./user-edit-form";
import { UserSessionsTab } from "./user-sessions-tab";
import { UserDevicesTab } from "./user-devices-tab";
import { UserActivityTab } from "./user-activity-tab";
import { UserPreferencesTab } from "./user-preferences-tab";
import { UserLoginHistoryTab } from "./user-login-history-tab";
import { UserMembershipSection } from "./user-membership-section";
import { UserAuditTab } from "./user-audit-tab";
import {
  Mail,
  Phone,
  Briefcase,
  Pencil,
  X,
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

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
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
  const { data: user, isLoading } = useUser(userId ?? "", { enabled: !!userId && open });

  function handleEditSuccess() {
    setIsEditing(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base">User Details</SheetTitle>
            {user && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading && <ProfileSkeleton />}

        {!isLoading && user && (
          <>
            {isEditing ? (
              <UserEditForm
                user={user}
                onSuccess={handleEditSuccess}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <Tabs defaultValue="profile" className="flex flex-col">
                <TabsList className="shrink-0 w-full justify-start h-8 bg-muted/50 rounded-md p-0.5 gap-0.5 flex-wrap">
                  {[
                    { value: "profile", label: "Profile" },
                    { value: "sessions", label: "Sessions" },
                    { value: "devices", label: "Devices" },
                    { value: "activity", label: "Activity" },
                    { value: "login-history", label: "Logins" },
                    { value: "audit", label: "Audit" },
                    { value: "preferences", label: "Prefs" },
                  ].map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-xs h-7 px-2.5"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="profile" className="mt-4 flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
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
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
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
                </TabsContent>

                <TabsContent value="sessions" className="mt-4 flex-1">
                  <UserSessionsTab userId={user.id} />
                </TabsContent>

                <TabsContent value="devices" className="mt-4 flex-1">
                  <UserDevicesTab userId={user.id} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4 flex-1">
                  <UserActivityTab userId={user.id} />
                </TabsContent>

                <TabsContent value="login-history" className="mt-4 flex-1">
                  <UserLoginHistoryTab userId={user.id} />
                </TabsContent>

                <TabsContent value="audit" className="mt-4 flex-1">
                  <UserAuditTab userId={user.id} />
                </TabsContent>

                <TabsContent value="preferences" className="mt-4 flex-1">
                  <UserPreferencesTab userId={user.id} />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
