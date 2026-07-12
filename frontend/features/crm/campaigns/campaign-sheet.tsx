"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCampaign, useUpdateCampaign } from "@/hooks/api/crm/campaigns";
import type { CrmCampaign } from "@/types/crm/campaigns";

const CAMPAIGN_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "social", label: "Social Media" },
  { value: "search", label: "Search / SEO" },
  { value: "paid", label: "Paid Ads" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  channel: z.string().optional(),
  utmCampaignKey: z.string().optional(),
  budgetAllocated: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: CrmCampaign;
}

export function CampaignSheet({ open, onOpenChange, campaign }: CampaignSheetProps) {
  const isEditing = !!campaign;
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      channel: "",
      utmCampaignKey: "",
      budgetAllocated: "",
      startDate: "",
      endDate: "",
      description: "",
      targetAudience: "",
    },
  });

  useEffect(() => {
    if (open && campaign) {
      form.reset({
        name: campaign.name,
        channel: campaign.channel ?? "",
        utmCampaignKey: campaign.utmCampaignKey ?? "",
        budgetAllocated: campaign.budgetAllocated ?? "",
        startDate: campaign.startDate ?? "",
        endDate: campaign.endDate ?? "",
        description: campaign.description ?? "",
        targetAudience: campaign.targetAudience ?? "",
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, campaign, form]);

  function handleSubmit(values: CampaignFormValues) {
    const payload = {
      name: values.name,
      channel: values.channel || null,
      utmCampaignKey: values.utmCampaignKey || null,
      budgetAllocated: values.budgetAllocated || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      description: values.description || null,
      targetAudience: values.targetAudience || null,
      ownerId: null,
    };

    if (isEditing && campaign) {
      updateMutation.mutate(
        { id: campaign.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Campaign updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Campaign created");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? "Edit Campaign" : "New Campaign"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update campaign details." : "Create a new marketing campaign."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Email Blast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAMPAIGN_CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utmCampaignKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UTM Campaign Key</FormLabel>
                  <FormControl>
                    <Input placeholder="summer_2024_email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetAllocated"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <Input placeholder="SMB decision-makers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Campaign objectives and notes..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton type="submit" isPending={isPending} loadingText="Saving..." className="w-full">
              {isEditing ? "Save Changes" : "Create Campaign"}
            </LoadingButton>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
