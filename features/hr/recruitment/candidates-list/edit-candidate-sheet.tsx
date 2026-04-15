"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useUpdateCandidate } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Candidate } from "@/types/hr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

interface EditCandidateSheetProps {
  open: boolean;
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
}

export const EditCandidateSheet = memo(function EditCandidateSheet({
  open,
  candidate,
  onOpenChange,
}: EditCandidateSheetProps) {
  const updateCandidate = useUpdateCandidate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("DIRECT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (candidate) {
      setFirstName(candidate.firstName);
      setLastName(candidate.lastName);
      setEmail(candidate.email);
      setPhone(candidate.phone ?? "");
      setCurrentRole(candidate.currentRole ?? "");
      setCurrentCompany(candidate.currentCompany ?? "");
      setLinkedinUrl(candidate.linkedinUrl ?? "");
      setSource(candidate.source ?? "DIRECT");
      setNotes(candidate.notes ?? "");
    }
  }, [candidate]);

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value), []);
  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value), []);
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value), []);
  const handleCurrentRoleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCurrentRole(e.target.value), []);
  const handleCurrentCompanyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCurrentCompany(e.target.value), []);
  const handleLinkedinUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLinkedinUrl(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const handleSave = useCallback(() => {
    if (!candidate) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    updateCandidate.mutate(
      {
        id: candidate.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        currentRole: currentRole.trim() || undefined,
        currentCompany: currentCompany.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        source: source || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Candidate updated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    candidate, firstName, lastName, email, phone, currentRole,
    currentCompany, linkedinUrl, source, notes, updateCandidate, onOpenChange,
  ]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(nextOpen),
    [onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Edit Candidate</SheetTitle>
          <SheetDescription className="text-xs">
            Update details for {candidate?.firstName} {candidate?.lastName}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input value={firstName} onChange={handleFirstNameChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input value={lastName} onChange={handleLastNameChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
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
                  <SelectItem value="NAUKRI">Naukri</SelectItem>
                  <SelectItem value="CAREERS_PAGE">Careers Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current Role</label>
              <Input
                value={currentRole}
                onChange={handleCurrentRoleChange}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current Company</label>
              <Input
                value={currentCompany}
                onChange={handleCurrentCompanyChange}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">LinkedIn URL</label>
            <Input
              value={linkedinUrl}
              onChange={handleLinkedinUrlChange}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={handleNotesChange}
              rows={3}
              placeholder="Internal notes about this candidate..."
            />
          </div>
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={updateCandidate.isPending}>
            {updateCandidate.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
