"use client";

import { useState, useCallback } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import {
  Mail,
  MapPin,
  Building2,
  User,
  Target,
  IndianRupee,
  StickyNote,
  UserPlus,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCheckLeadDuplicates } from "@/hooks/api/leads";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CrmOptionSelect } from "@/features/crm/shared/metadata";

interface CreateLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}

export function CreateLeadSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateLeadSheetProps) {
  const [priority, setPriority] = useState<string>("WARM");
  const [source, setSource] = useState<string>("referral");
  const [phone, setPhone] = useState<PhoneValue | undefined>();
  const [emailInput, setEmailInput] = useState("");

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmailInput(e.target.value),
    [],
  );
  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const debouncedEmail = useDebouncedValue(emailInput, 500);
  const debouncedPhone = useDebouncedValue(phone ?? "", 500);

  const { data: dupCheck } = useCheckLeadDuplicates(
    { email: debouncedEmail || undefined, phone: debouncedPhone || undefined },
    { enabled: open && (!!debouncedEmail || !!debouncedPhone) },
  );
  const hasDuplicates = (dupCheck?.duplicates?.length ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button className="shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                Create New Lead
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a new lead to your pipeline
              </p>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="px-0">
          <form
            id="create-lead-form"
            action={(formData) => {
              formData.set("priority", priority);
              formData.set("source", source);
              if (phone) formData.set("phone", phone);
              onSubmit(formData);
            }}
            className="px-6 py-4 space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contact Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Enter full name"
                    className=""
                  />
                </div>
                <div>
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9"
                      value={emailInput}
                      onChange={handleEmailChange}
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="phone"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Phone
                  </Label>
                  <PhoneInput
                    id="phone"
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={setPhone}
                    className=""
                  />
                </div>
                <div>
                  <Label
                    htmlFor="company"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Company
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      name="company"
                      placeholder="Acme Corp"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="city"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    City
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      name="city"
                      placeholder="Mumbai"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {hasDuplicates && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Possible duplicate
                    {dupCheck!.duplicates.length > 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dupCheck!.duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="font-medium truncate">{dup.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {dup.email && (
                          <span className="text-muted-foreground">
                            {dup.email}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0"
                        >
                          {dup.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  You can still create this lead if it&apos;s a different
                  person.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Lead Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Priority
                  </Label>
                  <CrmOptionSelect
                    type="priority"
                    value={priority}
                    onChange={setPriority}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Source
                  </Label>
                  <CrmOptionSelect
                    type="source"
                    value={source}
                    onChange={setSource}
                    className="w-full"
                  />
                </div>

                {source === "referral" && (
                  <div className="col-span-2">
                    <Label
                      htmlFor="referredBy"
                      className="text-xs font-medium mb-1.5 block"
                    >
                      Referred By <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="referredBy"
                        name="referredBy"
                        required
                        placeholder="Name of person who referred this lead"
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IndianRupee className="h-4 w-4" />
                <span>Financial Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="potentialValue"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Potential Value (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="potentialValue"
                      name="potentialValue"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5,00,000"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="investmentInterest"
                    className="text-xs font-medium mb-1.5 block"
                  >
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
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
          </form>
        </SheetBody>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="create-lead-form"
            className="flex-1"
            isPending={isPending}
            loadingText="Creating..."
          >
            Create Lead
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
