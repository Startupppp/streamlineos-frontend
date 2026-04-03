"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Plus, Search, Users, Mail, Phone, Building2,
  ChevronLeft, ChevronRight, Linkedin, Twitter, Tag,
  MoreHorizontal, Eye, Pencil, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useContacts, useCreateContact } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).regex(/^[a-zA-Z\s.'-]+$/, "Name must contain only letters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^[\d+\-\s()]*$/, "Phone must contain only numbers").optional().or(z.literal("")),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});
type CreateContactForm = z.infer<typeof createContactSchema>;

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContactsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounce search — only trigger API after 300ms and min 3 chars (#119)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const timer = setTimeout(() => {
      if (searchInput.length >= 3 || searchInput.length === 0) {
        setSearch(searchInput);
      }
    }, 300);
    debounceRef.current = timer;
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useContacts({
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const createContactMutation = useCreateContact();

  const form = useForm<CreateContactForm>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { name: "", email: "", phone: "", title: "", department: "", company: "", linkedinUrl: "", twitterUrl: "" },
  });

  const onSubmit = useCallback((data: CreateContactForm) => {
    createContactMutation.mutate(
      {
        name: capitalize(data.name.trim()),
        email: data.email || undefined,
        phone: data.phone || undefined,
        title: data.title || undefined,
        department: data.department || undefined,
        company: data.company || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
      },
      {
        onSuccess: () => { toast.success("Contact created"); setCreateOpen(false); },
        onError: (err) => toast.error(err.message),
      }
    );
    form.reset();
  }, [createContactMutation, form]);

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
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
        <PageHeader title="Contacts" description={`${data?.total ?? 0} contacts`} />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#bd882c] hover:bg-[#a67724] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Contact</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="Full name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" placeholder="email@example.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} placeholder="+91..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. VP of Sales" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl><Input {...field} placeholder="https://linkedin.com/in/..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={createContactMutation.isPending}>
                  {createContactMutation.isPending ? "Creating..." : "Create Contact"}
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
            placeholder="Search contacts (min 3 chars)..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.items.map(contact => (
          <Card key={contact.id} className="shadow-sm hover:shadow-md transition-all hover:border-[#bd882c]/40 cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-[#bd882c]/10 flex items-center justify-center text-sm font-semibold text-[#bd882c] shrink-0">
                  {contact.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-[#bd882c] transition-colors">{contact.name}</p>
                  {contact.title && <p className="text-xs text-muted-foreground truncate">{contact.title}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>
                    <DropdownMenuItem><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 space-y-1.5">
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{contact.company}</span>
                  </div>
                )}
              </div>

              {contact.tags && (contact.tags as string[]).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(contact.tags as string[]).slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                {contact.linkedinUrl && (
                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400">
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
                {contact.twitterUrl && (
                  <a href={contact.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-sky-400">
                    <Twitter className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {data?.items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <EmptyTeamIllustration className="mx-auto mb-3 w-36 h-36" />
          <p className="text-sm font-medium text-foreground">No contacts found</p>
          <p className="text-xs mt-1">Create your first contact to get started</p>
        </div>
      )}

      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
