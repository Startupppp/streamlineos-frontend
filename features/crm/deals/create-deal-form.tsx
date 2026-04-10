"use client";

import { useState, useCallback } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateDeal } from "@/lib/api/hooks/crm";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import type { DealStage } from "@/features/crm/shared/constants";
import { toast } from "sonner";

interface CreateDealFormProps {
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}

export function CreateDealForm({ employees, onSuccess }: CreateDealFormProps) {
  const createMutation = useCreateDeal();
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [contactPhone, setContactPhone] = useState<PhoneValue | undefined>();

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const value = Number(fd.get("value") || 0);

    createMutation.mutate(
      {
        name: fd.get("name") as string,
        value: String(isNaN(value) ? 0 : value),
        stage: (fd.get("stage") as DealStage) || "LEAD",
        probability: Number(fd.get("probability") || 0),
        contactPerson: (fd.get("contactPerson") as string) || undefined,
        contactEmail: (fd.get("contactEmail") as string) || undefined,
        contactPhone: contactPhone || (fd.get("contactPhone") as string) || undefined,
        assignedToId: (fd.get("assignedToId") as string) || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
      {
        onSuccess: () => { toast.success("Deal created"); onSuccess(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [createMutation, expectedCloseDate, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Deal Name *</Label>
          <Input id="name" name="name" required placeholder="e.g. Enterprise License" pattern="^[A-Za-z].*" title="Name must start with a letter" className="capitalize" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Value (INR)</Label>
          <Input id="value" name="value" type="number" min="0" placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stage">Stage</Label>
          <Select name="stage" defaultValue="LEAD">
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map(s => (
                <SelectItem key={s.key} value={s.key}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expectedCloseDate">Expected Close</Label>
          <DatePicker id="expectedCloseDate" value={expectedCloseDate} onChange={setExpectedCloseDate} placeholder="Select date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" name="contactPerson" placeholder="Name" pattern="^[A-Za-z\s]*$" title="Only letters allowed" className="capitalize" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="email@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <PhoneInput
            id="contactPhone"
            defaultCountry="IN"
            placeholder="Enter phone number"
            value={contactPhone}
            onChange={setContactPhone}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assignedToId">Assigned To</Label>
          <Select name="assignedToId">
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto">
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Additional notes..." className="min-h-[80px]" />
      </div>
      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create Deal"}
      </Button>
    </form>
  );
}
