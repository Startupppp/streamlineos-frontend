"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface OrgProfileData {
  name: string;
  slug: string;
}

interface OrgProfileSectionProps {
  org: OrgProfileData;
  isEditing: boolean;
  editName: string;
  editSlug: string;
  isUpdating: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onEditNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function OrgProfileSection({
  org,
  isEditing,
  editName,
  editSlug,
  isUpdating,
  canEdit,
  onStartEdit,
  onEditNameChange,
  onEditSlugChange,
  onSave,
  onCancel,
}: OrgProfileSectionProps) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Organization Details</CardTitle>
        <CardDescription>
          Update your workspace name and slug used across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          {isEditing ? (
            <Input
              id="name"
              value={editName}
              onChange={onEditNameChange}
              aria-label="Organization name"
            />
          ) : (
            <Input id="name" value={org.name} disabled className="bg-muted" aria-label="Organization name" />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          {isEditing ? (
            <Input
              id="slug"
              value={editSlug}
              onChange={onEditSlugChange}
              aria-label="Organization slug"
            />
          ) : (
            <Input id="slug" value={org.slug} disabled className="bg-muted" aria-label="Organization slug" />
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !isEditing && (
            <Button variant="outline" disabled={isUpdating} onClick={onStartEdit}>
              Edit Organization
            </Button>
          )}
          {isEditing && (
            <>
              <Button onClick={onSave} disabled={isUpdating || !editName.trim()}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={isUpdating}>
                Cancel
              </Button>
            </>
          )}
          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              Only Owners and Admins can edit organization settings.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
