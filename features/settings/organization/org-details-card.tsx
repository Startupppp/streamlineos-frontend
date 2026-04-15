"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import type { OrgSettings } from "@/types/organization";

interface OrgDetailsCardProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgDetailsCard({ org, canEdit }: OrgDetailsCardProps) {
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: updateOrg, isPending: isUpdatingOrg } = useUpdateOrgSettings();

  const handleStartEdit = useCallback(() => {
    setEditName(org.name);
    setEditSlug(org.slug);
    setIsEditing(true);
  }, [org]);

  const handleEditNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value),
    []
  );

  const handleEditSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")),
    []
  );

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleSave = useCallback(() => {
    if (!editName.trim()) return;
    updateOrg(
      { name: editName.trim(), slug: editSlug.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Organization updated successfully");
          setIsEditing(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update organization");
        },
      }
    );
  }, [editName, editSlug, updateOrg]);

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
              onChange={handleEditNameChange}
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
              onChange={handleEditSlugChange}
              aria-label="Organization slug"
            />
          ) : (
            <Input id="slug" value={org.slug} disabled className="bg-muted" aria-label="Organization slug" />
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !isEditing && (
            <Button variant="outline" disabled={isUpdatingOrg} onClick={handleStartEdit}>
              Edit Organization
            </Button>
          )}
          {isEditing && (
            <>
              <Button onClick={handleSave} disabled={isUpdatingOrg || !editName.trim()}>
                {isUpdatingOrg ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button variant="ghost" onClick={handleCancelEdit} disabled={isUpdatingOrg}>
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
