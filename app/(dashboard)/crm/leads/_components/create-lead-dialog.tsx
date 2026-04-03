"use client";

import { useState } from "react";
import {
  Phone, Mail, MapPin, Building2, User, Target,
  IndianRupee, StickyNote, Share2, Megaphone, Globe, Footprints, Flame, Sun, Snowflake, Users,
  UserPlus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface CreateLeadFormProps {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  onCancel: () => void;
}

function CreateLeadForm({ onSubmit, isPending, onCancel }: CreateLeadFormProps) {
  const [priority, setPriority] = useState<string>("WARM");
  const [source, setSource] = useState<string>("referral");

  return (
    <form
      action={(formData) => {
        formData.set("priority", priority);
        formData.set("source", source);
        onSubmit(formData);
      }}
      className="px-6 py-5 space-y-6"
    >
      {/* Contact Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Contact Information</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name" className="text-xs font-medium mb-1.5 block">
              Full Name <span className="text-red-400">*</span>
            </Label>
            <Input id="name" name="name" required placeholder="Enter full name" className="h-10" />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs font-medium mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" name="email" type="email" placeholder="john@example.com" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs font-medium mb-1.5 block">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" name="phone" placeholder="+91 9876543210" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="company" className="text-xs font-medium mb-1.5 block">Company</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="company" name="company" placeholder="Acme Corp" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="city" className="text-xs font-medium mb-1.5 block">City</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="city" name="city" placeholder="Mumbai" className="pl-9 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Classification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          <span>Lead Classification</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOT">
                  <span className="flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-red-400" /> Hot
                  </span>
                </SelectItem>
                <SelectItem value="WARM">
                  <span className="flex items-center gap-2">
                    <Sun className="h-3.5 w-3.5 text-amber-400" /> Warm
                  </span>
                </SelectItem>
                <SelectItem value="COLD">
                  <span className="flex items-center gap-2">
                    <Snowflake className="h-3.5 w-3.5 text-blue-400" /> Cold
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">
                  <span className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Referral</span>
                </SelectItem>
                <SelectItem value="campaign">
                  <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Campaign</span>
                </SelectItem>
                <SelectItem value="cold_call">
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Cold Call</span>
                </SelectItem>
                <SelectItem value="website">
                  <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Website</span>
                </SelectItem>
                <SelectItem value="social_media">
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Social Media</span>
                </SelectItem>
                <SelectItem value="walk_in">
                  <span className="flex items-center gap-2"><Footprints className="h-3.5 w-3.5" /> Walk-in</span>
                </SelectItem>
                <SelectItem value="other">
                  <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Other</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referred By — shown only when source is "referral" */}
          {source === "referral" && (
            <div className="sm:col-span-2">
              <Label htmlFor="referredBy" className="text-xs font-medium mb-1.5 block">
                Referred By <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="referredBy"
                  name="referredBy"
                  required
                  placeholder="Name of person who referred this lead"
                  className="pl-9 h-10"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IndianRupee className="h-4 w-4" />
          <span>Financial Details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="potentialValue" className="text-xs font-medium mb-1.5 block">Potential Value (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="potentialValue"
                name="potentialValue"
                type="number"
                min="0"
                step="1"
                placeholder="5,00,000"
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="investmentInterest" className="text-xs font-medium mb-1.5 block">
              Investment Interest (₹)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="investmentInterest"
                name="investmentInterest"
                type="number"
                min="0"
                step="1"
                placeholder="10,00,000"
                className="pl-9 h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <StickyNote className="h-4 w-4" />
          <span>Additional Notes</span>
        </div>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Any additional context about this lead..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5">
          Cancel
        </Button>
        <Button type="submit" className="bg-gold hover:bg-gold/90 text-white h-10 px-6" disabled={isPending}>
          {isPending ? "Creating..." : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}

export function CreateLeadDialog({ open, onOpenChange, onSubmit, isPending }: CreateLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-gold" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Create New Lead</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Add a new lead to your pipeline</p>
            </div>
          </div>
        </DialogHeader>
        <CreateLeadForm
          onSubmit={onSubmit}
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
