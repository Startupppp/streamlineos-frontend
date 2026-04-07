"use client";

import { useRouter } from "next/navigation";
import { useGetOrganizations } from "../../../../lib/hooks/auth-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Building2, Plus } from "lucide-react";

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { data: organizations, isLoading } = useGetOrganizations();
  const org = organizations?.[0];

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
              <div className="p-4 rounded-full bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
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
            <Input id="name" value={org.name} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={org.slug} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Input id="role" value={org.role} disabled className="bg-muted" />
          </div>
          <div className="pt-4">
            <Button variant="outline" disabled>
              Update Organization (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

