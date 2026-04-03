"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Search, Building2, Globe, Users, ChevronLeft, ChevronRight, Heart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations, useCreateCrmOrganization } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  description: z.string().optional(),
});
type CreateOrgForm = z.infer<typeof createOrgSchema>;

function getHealthBadge(score: number | null) {
  if (score === null || score === undefined) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted/50" };
  if (score >= 70) return { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-500/15" };
  if (score >= 40) return { label: "At Risk", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "Critical", color: "text-red-400", bg: "bg-red-500/15" };
}

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useCrmOrganizations({
    search: search || undefined,
    limit: PAGE_SIZE,
    page: page + 1,
  });

  const createOrgMutation = useCreateCrmOrganization();

  const form = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", domain: "", industry: "", website: "", linkedinUrl: "", description: "" },
  });

  const onSubmit = useCallback((formData: CreateOrgForm) => {
    createOrgMutation.mutate(
      {
        name: formData.name,
        domain: formData.domain || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        website: formData.website || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        description: formData.description || undefined,
      },
      {
        onSuccess: () => { toast.success("Organization created"); setCreateOpen(false); },
        onError: (err) => toast.error(err.message),
      }
    );
    form.reset();
  }, [createOrgMutation, form]);

  const totalPages = data?.totalPages ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <PageHeader title="Organizations" description={`${data?.totalCount ?? 0} organizations`} />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#bd882c] hover:bg-[#a67724] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="Organization name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="domain" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <FormControl><Input {...field} placeholder="example.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Real Estate" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="size" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-1000">201-1000</SelectItem>
                          <SelectItem value="1000+">1000+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="col-span-2">
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} rows={2} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={createOrgMutation.isPending}>
                  {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.organizations.map(org => {
          const health = getHealthBadge(org.healthScore);
          return (
            <Card key={org.id} className="shadow-sm hover:shadow-md transition-all hover:border-[#bd882c]/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#bd882c]/10 flex items-center justify-center text-sm font-semibold text-[#bd882c] shrink-0">
                      {org.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      {org.industry && <p className="text-xs text-muted-foreground">{org.industry}</p>}
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", health.bg, health.color)}>
                    <Heart className="h-2.5 w-2.5 mr-0.5" />
                    {org.healthScore !== null ? `${org.healthScore}%` : "N/A"}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5">
                  {org.domain && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span className="truncate">{org.domain}</span>
                    </div>
                  )}
                  {org.size && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>{org.size} employees</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[#bd882c]">
                        {org.website}
                      </a>
                    </div>
                  )}
                </div>

                {org.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{org.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {(data?.organizations.length ?? 0) === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <EmptyProjectsIllustration className="mx-auto mb-3 w-36 h-36" />
          <p className="text-sm font-medium text-foreground">No organizations found</p>
          <p className="text-xs mt-1">Create your first organization</p>
        </div>
      )}

      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
