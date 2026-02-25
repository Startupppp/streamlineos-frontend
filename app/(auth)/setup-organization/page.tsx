"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createOrganization, checkUserHasOrganization } from "@/server/actions/organization-actions";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { Building2, Loader2, ArrowRight } from "lucide-react";

const setupOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

type SetupOrgFormValues = z.infer<typeof setupOrgSchema>;

export default function SetupOrganizationPage() {
  const router = useRouter();

  const form = useForm<SetupOrgFormValues>({
    resolver: zodResolver(setupOrgSchema),
    defaultValues: { name: "", slug: "" },
  });

  const { isLoading: isChecking } = useQuery({
    queryKey: ["checkUserHasOrganization"],
    queryFn: async () => {
      const result = await checkUserHasOrganization();
      if (result.hasOrg) {
        router.replace("/dashboard");
      }
      return result;
    },
    retry: false,
  });

  const handleNameChange = (value: string) => {
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    form.setValue("name", value);
    form.setValue("slug", autoSlug);
  };

  const createOrgMutation = useMutation({
    mutationFn: async (values: SetupOrgFormValues) => {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("slug", values.slug);
      return createOrganization(formData);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization created successfully!");
      router.push("/onboarding");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const onSubmit = (values: SetupOrgFormValues) => {
    createOrgMutation.mutate(values);
  };

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-lg"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="text-center mb-8">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Setup Organization</h1>
        <p className="text-muted-foreground mt-2">
          Tell us a bit about your business to customize your CRM experience.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Step 1 of 3</span>
          <span className="text-muted-foreground">33% Completed</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={33} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full w-1/3 gold-gradient rounded-full transition-all duration-500" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
      <Card className="shadow-noir border-border">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Corporation"
                value={form.watch("name")}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={createOrgMutation.isPending}
                className="focus-visible:ring-primary"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Your company or team name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-foreground">Organization Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">vaivamm.com/</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="acme-corp"
                  {...form.register("slug")}
                  disabled={createOrgMutation.isPending}
                  className="focus-visible:ring-primary flex-1"
                />
              </div>
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase letters, numbers, hyphens)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={createOrgMutation.isPending}
            >
              {createOrgMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating this organization, you agree to our Terms of Service
            </p>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}
