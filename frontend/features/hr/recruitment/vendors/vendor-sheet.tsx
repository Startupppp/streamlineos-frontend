"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateVendor,
  useUpdateVendor,
  type RecruitmentVendor,
  type CreateVendorInput,
  type UpdateVendorInput,
  type VendorContractType,
} from "@/hooks/api";

interface VendorSheetProps {
  initial?: RecruitmentVendor | null;
  onClose: () => void;
}

export function VendorSheet({ initial, onClose }: VendorSheetProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [feePercent, setFeePercent] = useState(
    initial?.feePercent ? String(parseFloat(initial.feePercent)) : "",
  );
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(initial?.status ?? "ACTIVE");
  const [contractType, setContractType] = useState<VendorContractType>(initial?.contractType ?? "CONTINGENCY");
  const [slaDays, setSlaDays] = useState(initial?.slaDays ? String(initial.slaDays) : "");
  const [replacementGuaranteeDays, setReplacementGuaranteeDays] = useState(
    initial?.replacementGuaranteeDays ? String(initial.replacementGuaranteeDays) : "",
  );

  const create = useCreateVendor();
  const update = useUpdateVendor(initial?.id ?? 0);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    const fee = feePercent ? parseFloat(feePercent) : undefined;
    if (fee !== undefined && (isNaN(fee) || fee < 0 || fee > 100)) {
      toast.error("Fee percent must be between 0 and 100");
      return;
    }
    const payload: CreateVendorInput & UpdateVendorInput = {
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      website: website.trim() || undefined,
      feePercent: fee,
      status,
      contractType,
      slaDays: slaDays ? Number(slaDays) : undefined,
      replacementGuaranteeDays: replacementGuaranteeDays ? Number(replacementGuaranteeDays) : undefined,
    };

    if (initial) {
      update.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor updated");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor added");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [
    name, contactName, contactEmail, contactPhone, website, feePercent,
    status, contractType, slaDays, replacementGuaranteeDays, initial, create, update, onClose,
  ]);

  const handleContactPhoneChange = useCallback((value: string) => { setContactPhone(value); }, []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleContactNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value), []);
  const handleContactEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value), []);
  const handleFeeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFeePercent(e.target.value), []);
  const handleWebsiteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setWebsite(e.target.value), []);
  const handleSlaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSlaDays(e.target.value), []);
  const handleGuaranteeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setReplacementGuaranteeDays(e.target.value), []);
  const handleStatusChange = useCallback((v: string) => setStatus(v as "ACTIVE" | "INACTIVE"), []);
  const handleContractTypeChange = useCallback((v: string) => setContractType(v as VendorContractType), []);
  const handleOpenChange = useCallback((v: boolean) => { if (!v) onClose(); }, [onClose]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{initial ? "Edit Vendor" : "Add Vendor"}</SheetTitle>
          <SheetDescription>Staffing agency or recruitment vendor details</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3 px-6 py-5">
          <div className="space-y-1.5">
            <Label>Agency Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={handleNameChange} placeholder="e.g. TalentBridge Inc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input value={contactName} onChange={handleContactNameChange} placeholder="Account manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={contactEmail} onChange={handleContactEmailChange} placeholder="manager@agency.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <PhoneInput value={contactPhone} onChange={handleContactPhoneChange} defaultCountry="IN" />
            </div>
            <div className="space-y-1.5">
              <Label>Fee %</Label>
              <Input type="number" min={0} max={100} step={0.5} value={feePercent} onChange={handleFeeChange} placeholder="e.g. 15" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={website} onChange={handleWebsiteChange} placeholder="https://agency.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Engagement Type</Label>
            <Select value={contractType} onValueChange={handleContractTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTINGENCY">Contingency (Perm Placement)</SelectItem>
                <SelectItem value="CONTRACT_STAFFING">Contract Staffing</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SLA (days)</Label>
              <Input type="number" min={1} value={slaDays} onChange={handleSlaChange} placeholder="e.g. 14" />
            </div>
            <div className="space-y-1.5">
              <Label>Replacement Guarantee (days)</Label>
              <Input type="number" min={1} value={replacementGuaranteeDays} onChange={handleGuaranteeChange} placeholder="e.g. 90" />
            </div>
          </div>
          {initial && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </SheetBody>
        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
            {isPending ? "Saving..." : initial ? "Save Changes" : "Add Vendor"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
