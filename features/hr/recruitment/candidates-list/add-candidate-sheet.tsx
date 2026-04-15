"use client";

import { memo, useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useCreateCandidate } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

interface AddCandidateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCandidateSheet = memo(function AddCandidateSheet({
  open,
  onOpenChange,
}: AddCandidateSheetProps) {
  const createCandidate = useCreateCandidate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("DIRECT");

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value), []);
  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value), []);
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value), []);

  const handleCreate = useCallback(() => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    createCandidate.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone || undefined,
        source,
      },
      {
        onSuccess: () => {
          toast.success("Candidate added");
          onOpenChange(false);
          setFirstName("");
          setLastName("");
          setEmail("");
          setPhone("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [firstName, lastName, email, phone, source, createCandidate, onOpenChange]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Add Candidate</SheetTitle>
          <SheetDescription className="text-xs">Add a new candidate to the pipeline.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">First Name</label>
              <Input value={firstName} onChange={handleFirstNameChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Last Name</label>
              <Input value={lastName} onChange={handleLastNameChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={handleEmailChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input value={phone} onChange={handlePhoneChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Source</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Direct</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                  <SelectItem value="CAMPUS">Campus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={createCandidate.isPending}>
            {createCandidate.isPending ? "Adding..." : "Add Candidate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
