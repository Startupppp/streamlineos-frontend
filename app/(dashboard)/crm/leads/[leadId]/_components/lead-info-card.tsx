"use client";

import { type UseFormReturn } from "react-hook-form";
import {
  Mail,
  Phone,
  MessageSquare,
  Building2,
  Target,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { type EditForm } from "./lead-types";

interface LeadInfoCardProps {
  lead: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
    company?: string | null;
    source?: string | null;
    city?: string | null;
    potentialValue?: string | null;
    investmentInterest?: string | null;
    notes?: string | null;
    tags?: unknown;
    [key: string]: unknown;
  };
  isEditing: boolean;
  editForm: UseFormReturn<EditForm>;
  isUpdatePending: boolean;
  onEditSubmit: (data: EditForm) => void;
  onCancelEdit: () => void;
}

export function LeadInfoCard({
  lead,
  isEditing,
  editForm,
  isUpdatePending,
  onEditSubmit,
  onCancelEdit,
}: LeadInfoCardProps) {
  if (isEditing) {
    return (
      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Edit Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOT">Hot</SelectItem>
                          <SelectItem value="WARM">Warm</SelectItem>
                          <SelectItem value="COLD">Cold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="potentialValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Value</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="investmentInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Interest</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2">
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#bd882c] hover:bg-[#a67724] text-white"
                  disabled={isUpdatePending}
                >
                  {isUpdatePending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              icon: Mail,
              label: "Email",
              value: lead.email,
              href: lead.email ? `mailto:${lead.email}` : undefined,
            },
            {
              icon: Phone,
              label: "Phone",
              value: lead.phone,
              href: lead.phone ? `tel:${lead.phone}` : undefined,
            },
            {
              icon: MessageSquare,
              label: "WhatsApp",
              value: lead.whatsappNumber,
            },
            { icon: Building2, label: "Company", value: lead.company },
            {
              icon: Target,
              label: "Source",
              value: lead.source?.replace("_", " "),
            },
            { icon: User, label: "City", value: lead.city },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-sm text-[#bd882c] hover:underline"
                  >
                    {item.value || "\u2014"}
                  </a>
                ) : (
                  <p className="text-sm capitalize">{item.value || "\u2014"}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {(lead.potentialValue || lead.investmentInterest) && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-[#bd882c]/5 border border-border/50">
            {lead.potentialValue && (
              <div>
                <p className="text-xs text-muted-foreground">Potential Value</p>
                <p className="text-xl font-bold text-emerald-400">
                  {"\u20B9"}
                  {Number(lead.potentialValue).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {lead.investmentInterest && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Investment Interest
                </p>
                <p className="text-xl font-bold text-[#bd882c]">
                  {"\u20B9"}
                  {Number(lead.investmentInterest).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        )}

        {lead.notes && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {Array.isArray(lead.tags) && (lead.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(lead.tags as string[]).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
