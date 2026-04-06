"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
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
        contactPhone: (fd.get("contactPhone") as string) || undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Deal Name *</Label>
          <Input id="name" name="name" required placeholder="e.g. Enterprise License" />
        </div>
        <div>
          <Label htmlFor="value">Value (INR)</Label>
          <Input id="value" name="value" type="number" min="0" placeholder="0" />
        </div>
        <div>
          <Label htmlFor="stage">Stage</Label>
          <Select name="stage" defaultValue="LEAD">
            <SelectTrigger>
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
        <div>
          <Label htmlFor="probability">Probability (%)</Label>
          <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="expectedCloseDate">Expected Close</Label>
          <DatePicker id="expectedCloseDate" value={expectedCloseDate} onChange={setExpectedCloseDate} placeholder="Select date" />
        </div>
        <div>
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" name="contactPerson" placeholder="Name" />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="email@example.com" />
        </div>
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input id="contactPhone" name="contactPhone" placeholder="+91..." />
        </div>
        <div>
          <Label htmlFor="assignedToId">Assigned To</Label>
          <Select name="assignedToId">
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Additional notes..." className="min-h-[80px]" />
      </div>
      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create Deal"}
      </Button>
    </form>
  );
}
