"use client";

import { useRouter } from "next/navigation";
import { useGetOrganizations, useCreateOrganization } from "../../lib/hooks/auth-hooks";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

export default function OrgSelectionPage() {
  const router = useRouter();
  const { data: organizations, isLoading } = useGetOrganizations();
  const createOrg = useCreateOrganization();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const handleSelectOrg = (orgId: string) => {
    // Store selected org in session or context
    router.push("/dashboard");
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-");
      await createOrg.mutateAsync({
        name: formData.name,
        slug: slug,
      });
      toast.success("Organization created!");
      setShowCreateForm(false);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create organization";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Select Organization
          </h1>
          <p className="text-zinc-400 mt-2">
            Please select or create an organization to continue to the CRM.
          </p>
        </div>

        {!showCreateForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>Select an organization to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organizations && organizations.length > 0 ? (
                <>
                  {organizations.map((org) => (
                    <Button
                      key={org.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSelectOrg(org.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">{org.name}</span>
                        <span className="text-xs text-muted-foreground">{org.slug}</span>
                      </div>
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + Create New Organization
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have any organizations yet.
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    Create Your First Organization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Organization</CardTitle>
              <CardDescription>Create a new organization to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (optional)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="acme-inc"
                    pattern="^[a-z0-9-]+$"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from name if not provided
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createOrg.isPending}>
                    {createOrg.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
