"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createOrganization, checkUserHasOrganization } from "@/server/actions/organization-actions";
import { Building2, Loader2 } from "lucide-react";

export default function SetupOrganizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });

  // Check if user already has an organization
  useEffect(() => {
    const checkOrg = async () => {
      try {
        const result = await checkUserHasOrganization();
        if (result.hasOrg) {
          // User already has an organization, redirect to dashboard
          router.replace("/dashboard");
          return;
        }
      } catch {
        // If check fails, allow access to setup page
      } finally {
        setIsChecking(false);
      }
    };
    checkOrg();
  }, [router]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    
    setFormData({
      name: value,
      slug: autoSlug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData();
    form.append("name", formData.name);
    form.append("slug", formData.slug);

    try {
      const result = await createOrganization(form);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Organization created successfully!");
      router.push("/onboarding");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking organization membership
  if (isChecking) {
    return (
      <div className="min-h-screen w-full noir-mesh flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full noir-mesh flex flex-col items-center justify-center p-4 relative">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-card border border-gold/20 p-2 rounded-xl mb-4 shadow-noir">
          <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Set Up Your Organization
        </h1>
        <p className="text-muted-foreground mt-2 text-center max-w-md">
          Create your first organization to start managing your team, projects, and HR operations.
        </p>
      </div>

      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-primary">Create Organization</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            This will be your company or team workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Your company or team name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-foreground">Organization Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">vaivamm.com/</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  required
                  disabled={isLoading}
                  className="focus-visible:ring-primary flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase letters, numbers, hyphens)
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isLoading || !formData.name || !formData.slug}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization & Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-muted-foreground/60 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}
