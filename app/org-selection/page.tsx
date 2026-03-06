"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGetOrganizations, useCreateOrganization } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateSlug } from "@/lib/utils";
import { BrandHeader } from "@/components/layout/brand-header";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { Loader2, ChevronRight, Plus, Building2, ArrowRight, Search } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

export default function OrgSelectionPage() {
  const router = useRouter();
  const { data: organizations, isLoading } = useGetOrganizations();
  const createOrg = useCreateOrganization();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const handleSelectOrg = useCallback(
    (orgId: string) => {
      router.push(`/dashboard?org=${orgId}`);
    },
    [router],
  );

  const handleCreateOrg = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        let slug = formData.slug.trim();
        if (!slug) {
          slug = generateSlug(formData.name);
        } else {
          slug = generateSlug(slug);
        }

        if (!slug) {
          toast.error("Unable to generate a valid slug from the organization name. Please provide a slug manually.");
          return;
        }

        await createOrg.mutateAsync({ name: formData.name, slug });
        toast.success("Organization created!");
        setShowCreateForm(false);
        router.push("/dashboard");
      } catch (error: unknown) {
        let message = "Failed to create organization";
        if (error && typeof error === "object" && "data" in error) {
          const trpcError = error as { data?: { zodError?: { fieldErrors?: Record<string, string[]> } } };
          if (trpcError.data?.zodError?.fieldErrors) {
            const fieldErrors = trpcError.data.zodError.fieldErrors;
            if (fieldErrors.slug) {
              message = `Invalid slug: ${fieldErrors.slug[0] || "Slug must contain only lowercase letters, numbers, and hyphens"}`;
            } else if (fieldErrors.name) {
              message = `Invalid name: ${fieldErrors.name[0] || "Name is required"}`;
            }
          }
        } else if (error instanceof Error) {
          message = error.message;
        }
        toast.error(message);
      }
    },
    [formData, createOrg, router],
  );

  const filteredOrgs = useMemo(
    () =>
      organizations?.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [organizations, searchQuery],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, name: e.target.value })),
    [],
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = generateSlug(e.target.value);
      setFormData((prev) => ({ ...prev, slug: value }));
    },
    [],
  );

  const handleShowCreate = useCallback(() => setShowCreateForm(true), []);
  const handleCancelCreate = useCallback(() => setShowCreateForm(false), []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full noir-mesh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full noir-mesh flex flex-col relative">
      <BrandHeader />

      <main id="main-content" aria-label="Organization selection" className="flex-1 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Select Organization</h1>
            <p className="text-muted-foreground mt-2">Choose a workspace to continue your progress</p>
          </motion.div>

          {!showCreateForm ? (
            <motion.div variants={fadeUp}>
              <Card className="shadow-noir border-border">
                <CardContent className="pt-6 space-y-4">
                  {organizations && organizations.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-10 focus-visible:ring-primary"
                        aria-label="Search organizations"
                      />
                    </div>
                  )}

                  {filteredOrgs && filteredOrgs.length > 0 ? (
                    <div className="space-y-2" role="list" aria-label="Organizations">
                      {filteredOrgs.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleSelectOrg(org.id)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-gold/30 hover:shadow-sm transition-all group"
                          role="listitem"
                          aria-label={`Select ${org.name}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.name}</p>
                              <p className="text-xs text-muted-foreground">{org.slug}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">You do not have any organizations yet.</p>
                    </div>
                  )}

                  <div className="deco-line" />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleShowCreate}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Organization
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp}>
              <Card className="shadow-noir border-border">
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-3">
                      <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Create Organization</h2>
                    <p className="text-sm text-muted-foreground mt-1">Set up a new workspace for your team</p>
                  </div>

                  <form onSubmit={handleCreateOrg} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name" className="text-foreground">Organization Name</Label>
                      <Input
                        id="org-name"
                        value={formData.name}
                        onChange={handleNameChange}
                        placeholder="Acme Inc."
                        required
                        autoComplete="organization"
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug" className="text-foreground">Slug (optional)</Label>
                      <Input
                        id="org-slug"
                        value={formData.slug}
                        onChange={handleSlugChange}
                        placeholder="acme-inc"
                        pattern="^[a-z0-9-]+$"
                        className="focus-visible:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-generated from name if not provided. Only lowercase letters, numbers, and hyphens allowed.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={createOrg.isPending}>
                        {createOrg.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Create
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelCreate}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      <footer className="w-full py-4 text-center text-muted-foreground/50 text-xs">
        &copy; {CURRENT_YEAR} Vaivamm Capital. All rights reserved.
      </footer>
    </div>
  );
}
