"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2 } from "lucide-react";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: organizations, isLoading, refetch } = useGetOrganizations();
  const org = organizations?.[0];

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const role = session?.user?.role;
  const canEdit = role === "OWNER" || role === "ADMIN";

  const updateOrg = api.organization.updateOrganization.useMutation({
    onSuccess: async () => {
      toast.success("Organization updated successfully");
      setIsEditing(false);
      await refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update organization");
    },
  });

  const handleStartEdit = useCallback(() => {
    if (!org) return;
    setEditName(org.name);
    setEditSlug(org.slug);
    setIsEditing(true);
  }, [org]);

  const handleSave = useCallback(() => {
    if (!editName.trim()) return;
    updateOrg.mutate({
      name: editName.trim(),
      slug: editSlug.trim() || undefined,
    });
  }, [editName, editSlug, updateOrg]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <EmptyProjectsIllustration />
            </div>
            <CardTitle>No Organization Found</CardTitle>
            <CardDescription>
              Create your first organization to start managing your team and projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => router.push("/setup-organization")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Manage your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            {isEditing ? (
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                aria-label="Organization slug"
              />
            ) : (
              <Input id="slug" value={org.slug} disabled className="bg-muted" aria-label="Organization slug" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Input id="role" value={org.role} disabled className="bg-muted" aria-label="Your role" />
          </div>
          <div className="pt-4 flex gap-2">
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={handleStartEdit}>
                Edit Organization
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={handleSave} disabled={updateOrg.isPending || !editName.trim()}>
                  {updateOrg.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={updateOrg.isPending}>
                  Cancel
                </Button>
              </>
            )}
            {!canEdit && (
              <p className="text-sm text-muted-foreground">Only Owners and Admins can edit organization settings.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
