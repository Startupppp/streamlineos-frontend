"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useMarketingCampaigns, useCreateMarketingCampaign, useDeleteMarketingCampaign } from "@/lib/api/hooks/crm";
import type { MarketingCampaign } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

export default function CampaignsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, isLoading } = useMarketingCampaigns();
  const createCampaign = useCreateMarketingCampaign();
  const deleteCampaign = useDeleteMarketingCampaign();

  const items: MarketingCampaign[] = Array.isArray(data) ? data : [];

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCampaign.mutate(
      {
        name: fd.get("name") as string,
        channel: (fd.get("channel") as string) || undefined,
        description: (fd.get("description") as string) || undefined,
        budgetAllocated: (fd.get("budgetAllocated") as string) || undefined,
        startDate: (fd.get("startDate") as string) || undefined,
        endDate: (fd.get("endDate") as string) || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Campaign created");
          setSheetOpen(false);
        },
        onError: () => toast.error("Failed to create campaign"),
      },
    );
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteCampaign.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Campaign deleted");
        setDeleteId(null);
      },
      onError: () => toast.error("Failed to delete"),
    });
  }

  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Manage marketing campaigns"
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Campaign
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No campaigns yet. Create your first campaign.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeleteId(c.id)}
                  aria-label="Delete campaign"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
                  {c.status}
                </span>
                {c.channel && (
                  <Badge variant="outline" className="text-[11px]">{c.channel}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium">{c.budgetAllocated ? fmt(c.budgetAllocated) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leads</p>
                  <p className="font-medium">{c.leads ?? 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Campaign</SheetTitle>
            <SheetDescription>Launch a new marketing campaign.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input name="name" placeholder="e.g. Q2 LinkedIn Ads" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select name="channel">
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Organic Search">Organic Search</SelectItem>
                  <SelectItem value="Paid Ads">Paid Ads</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" placeholder="Campaign details..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetAllocated">Budget (₹)</Label>
              <Input name="budgetAllocated" type="text" placeholder="e.g. 100000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input type="date" name="startDate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input type="date" name="endDate" />
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? "Creating..." : "Create"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCampaign.isPending}>
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
