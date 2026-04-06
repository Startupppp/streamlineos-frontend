"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { useCreateContact } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")).refine((val) => !val || isValidPhoneNumber(val), { message: "Invalid phone number" }),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});
type CreateContactForm = z.infer<typeof createContactSchema>;

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
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
        onSuccess: () => { toast.success("Contact created"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [createContactMutation, form, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gold hover:bg-gold/90 text-white">
          <Plus className="h-4 w-4 mr-2" />New Contact
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
                  <FormControl>
                    <PhoneInput defaultCountry="IN" placeholder="Enter phone number" {...field} />
                  </FormControl>
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
            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createContactMutation.isPending}>
              {createContactMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
