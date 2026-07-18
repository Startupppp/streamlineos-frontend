"use client";

import { useCallback, useEffect, useRef } from "react";
import { type UseFormReturn } from "react-hook-form";
import {
  Mail,
  Phone,
  MessageSquare,
  Building2,
  Target,
  User,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { cn } from "@/lib/utils";
import { type EditForm } from "./lead-types";
import { useState } from "react";
import { CustomFieldsSection } from "@/features/crm/shared/custom-fields-section";
import { MessagingPanel } from "@/features/crm/shared/messaging-panel";
import { toast } from "sonner";

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
    tags?: string[] | null;
    customFields?: Record<string, unknown>;
  };
  entityId: number;
  isEditing: boolean;
  editForm: UseFormReturn<EditForm>;
  isUpdatePending: boolean;
  onEditSubmit: (data: EditForm) => void;
  onCancelEdit: () => void;
}

function CopyChip({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied`);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [value, label]
  );

  if (!value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/30 opacity-40 select-none">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">—</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        title={`Copy ${label}`}
      >
        {copied ? (
          <CheckCheck className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </>
  );

  return href ? (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all">
      {content}
    </div>
  );
}

export function LeadInfoCard({
  lead,
  entityId,
  isEditing,
  editForm,
  isUpdatePending,
  onEditSubmit,
  onCancelEdit,
}: LeadInfoCardProps) {
  if (isEditing) {
    return (
      <Card className="shadow-sm">
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
                        <PhoneInput
                          defaultCountry="IN"
                          placeholder="Enter phone number"
                          {...field}
                        />
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
                <Button type="button" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={isUpdatePending}
                  loadingText="Saving..."
                >
                  Save Changes
                </LoadingButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  const contactChips = [
    {
      icon: Mail,
      label:"Email",
      value: lead.email,
      href: lead.email ? `mailto:${lead.email}` : undefined,
    },
    {
      icon: Phone,
      label:"Phone",
      value: lead.phone,
      href: lead.phone ? `tel:${lead.phone}` : undefined,
    },
    {
      icon: MessageSquare,
      label:"WhatsApp",
      value: lead.whatsappNumber,
      href: lead.whatsappNumber
        ? `https://wa.me/${lead.whatsappNumber.replace(/\D/g,"")}`
        : undefined,
    },
    { icon: Building2, label:"Company", value: lead.company },
    {
      icon: Target,
      label:"Source",
      value: lead.source?.replace(/_/g, " "),
    },
    { icon: User, label:"City", value: lead.city },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {contactChips.map((chip) => (
            <CopyChip
              key={chip.label}
              icon={chip.icon}
              label={chip.label}
              value={chip.value}
              href={chip.href}
            />
          ))}
        </div>

        {(lead.phone ?? lead.whatsappNumber) && (
          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Quick Actions
            </p>
            <MessagingPanel
              phone={lead.phone ?? lead.whatsappNumber}
              entityType="LEAD"
              entityId={entityId}
            />
          </div>
        )}

        {(lead.potentialValue || lead.investmentInterest) && (
          <div
            className={cn(
"grid gap-4 p-4 rounded-lg border border-border",
              lead.potentialValue && lead.investmentInterest
                ?"grid-cols-2"
                :"grid-cols-1",
"bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5"
            )}
          >
            {lead.potentialValue && (
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Potential Value
                </p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                  ₹{Number(lead.potentialValue).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {lead.investmentInterest && (
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Investment Interest
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  ₹{Number(lead.investmentInterest).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        )}

        {lead.notes && (
          <div className="rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/30 border-b border-border/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Notes
              </p>
            </div>
            <p className="text-sm whitespace-pre-wrap px-3 py-2.5 font-mono leading-relaxed text-muted-foreground">
              {lead.notes}
            </p>
          </div>
        )}

        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <CustomFieldsSection
          entityType="lead"
          values={lead.customFields ?? {}}
          className="pt-2"
        />
      </CardContent>
    </Card>
  );
}
