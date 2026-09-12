"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, Briefcase, Linkedin, Twitter, Github, Globe } from "lucide-react";
import type { User } from "@/hooks/api/users";
import type { EmploymentFacts } from "@/hooks/api/directory/employment";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import { resolveImageUrl } from "@/lib/utils";
import { UserStatusBadge } from "./user-status-badge";
import { UserMembershipSection } from "./user-membership-section";
import { UserModuleAccessSection } from "./user-module-access-section";
import { UserAccessLinksSection } from "./user-access-links-section";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface UserProfileOverviewProps {
  user: User;
  employment: EmploymentFacts | undefined;
  canManage: boolean;
  onStartEditing: () => void;
}

export function UserProfileOverview({
  user,
  employment,
  canManage,
  onStartEditing,
}: UserProfileOverviewProps) {
  const isMemberActive = user.userStatus ? user.userStatus === "active" : user.isActive;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={resolveImageUrl(user.image)} alt={user.name ?? user.email} />
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
              {employment?.designation && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {employment?.designation}
                </p>
              )}
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 text-xs"
                onClick={onStartEditing}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className="text-micro h-5 px-1.5">
              {formatRoleLabel(user.role)}
            </Badge>
            <UserStatusBadge
              isActive={isMemberActive}
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
        {employment?.designation && (
          <div className="flex items-center gap-2.5 text-xs">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-foreground">{employment?.designation}</span>
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
        isMemberActive={isMemberActive}
      />

      <Separator />
      <UserAccessLinksSection userId={user.id} />
    </div>
  );
}
