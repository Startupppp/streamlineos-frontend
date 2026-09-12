"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { WIZARD_EASE } from "@/components/wizard-shell";
import type { StepId } from "../lib/constants";
import {
  formatAddressBlock,
  formatPreviewDate,
  formatPreviewGender,
  maskAccountNumber,
  previewInitials,
  previewSnapshotsEqual,
  type EmployeePreviewSnapshot,
} from "../lib/preview-snapshot";

type ProfilePreviewProps = {
  snapshot: EmployeePreviewSnapshot;
  stepId: StepId;
  className?: string;
};

type FieldRowProps = {
  label: string;
  value: string;
  placeholder: string;
  filled: boolean;
};

function FieldRow({ label, value, placeholder, filled }: FieldRowProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <p className="shrink-0 text-dense font-medium text-muted-foreground">
        {label}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={filled ? value : `empty-${label}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: WIZARD_EASE }}
          className={cn(
            "min-w-0 flex-1 text-right text-xs leading-snug",
            filled ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {filled ? value : placeholder}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function ProfilePreviewInner({
  snapshot,
  stepId,
  className,
}: ProfilePreviewProps) {
  const reduceMotion = useReducedMotion();
  const name = snapshot.displayName.trim() || "Your name";
  const nameFilled = snapshot.displayName.trim().length > 0;
  const initials = previewInitials(snapshot.displayName, snapshot.email);
  const role = snapshot.roleLabel.trim();
  const email = snapshot.email.trim();
  const phone = snapshot.phone.trim();
  const gender = formatPreviewGender(snapshot.gender);
  const dob = formatPreviewDate(snapshot.dateOfBirth);
  const address = formatAddressBlock(snapshot);
  const emergencyName = snapshot.emergencyName.trim();
  const emergencyRelation = snapshot.emergencyRelation.trim();
  const emergencyPhone = snapshot.emergencyPhone.trim();
  const emergencyLine = [emergencyName, emergencyRelation, emergencyPhone]
    .filter(Boolean)
    .join(" · ");

  const showPayroll = stepId === "bank" || stepId === "finish";
  const bankFilled =
    snapshot.bankName.trim().length > 0 ||
    snapshot.accountNumber.trim().length > 0;
  const bankLine = [
    snapshot.bankName.trim(),
    snapshot.accountNumber.trim()
      ? maskAccountNumber(snapshot.accountNumber)
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const holder = snapshot.accountHolder.trim();
  const bankCode = snapshot.bankCode.trim();

  return (
    <div className={cn("relative flex min-h-0 w-full min-w-0", className)}>
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-brand-core/12 via-transparent to-brand-cyan/10 blur-2xl"
        aria-hidden
      />

      <motion.div
        layout={!reduceMotion}
        className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_28px_60px_-32px_rgba(30,64,175,0.28)]"
        aria-live="polite"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-brand-core/[0.06] to-transparent"
          aria-hidden
        />

        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-core/10 text-brand-core">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-dense font-semibold tracking-tight text-foreground">
                People
              </p>
              <p className="truncate text-micro text-muted-foreground">
                Directory · Employee profile
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-status-success-rule bg-status-success-surface px-2 py-0.5 text-micro font-semibold text-status-success-ink">
            Active
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-hide p-4">
          <div className="flex items-start gap-3.5">
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-border shadow-sm">
              <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={name}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: WIZARD_EASE }}
                  className={cn(
                    "truncate font-display text-lg font-extrabold tracking-[-0.03em]",
                    nameFilled ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {name}
                </motion.p>
              </AnimatePresence>
              <div className="flex flex-wrap items-center gap-1.5">
                {role ? (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{role}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 px-2 py-0.5 text-micro text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                    Role
                  </span>
                )}
              </div>
              {email ? (
                <p className="flex min-w-0 items-center gap-1.5 text-dense text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{email}</span>
                </p>
              ) : null}
            </div>
          </div>

          <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-dense font-semibold text-foreground">
              <UserRound className="h-3.5 w-3.5 text-brand-core" aria-hidden />
              Contact
            </div>
            <div className="space-y-2">
              <FieldRow
                label="Phone"
                value={phone}
                placeholder="Add phone"
                filled={phone.length > 0}
              />
              <FieldRow
                label="Birthday"
                value={dob}
                placeholder="Add date of birth"
                filled={dob.length > 0}
              />
              <FieldRow
                label="Gender"
                value={gender}
                placeholder="Select gender"
                filled={gender.length > 0}
              />
            </div>
          </section>

          <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-dense font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-brand-core" aria-hidden />
              Home address
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={address || "empty-address"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: WIZARD_EASE }}
                className={cn(
                  "whitespace-pre-line text-xs leading-relaxed",
                  address
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {address || "Street, city, and postal code appear here"}
              </motion.p>
            </AnimatePresence>
          </section>

          <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-dense font-semibold text-foreground">
              <Shield className="h-3.5 w-3.5 text-brand-core" aria-hidden />
              Emergency contact
            </div>
            <div className="space-y-2">
              <FieldRow
                label="Contact"
                value={emergencyLine || emergencyName}
                placeholder="Name · relation · phone"
                filled={emergencyLine.length > 0}
              />
              {!emergencyLine && emergencyPhone ? (
                <FieldRow
                  label="Phone"
                  value={emergencyPhone}
                  placeholder=""
                  filled
                />
              ) : null}
            </div>
          </section>

          <AnimatePresence initial={false}>
            {showPayroll ? (
              <motion.section
                key="payroll"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                transition={{ duration: 0.22, ease: WIZARD_EASE }}
                className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-center gap-1.5 text-dense font-semibold text-foreground">
                  <Landmark
                    className="h-3.5 w-3.5 text-brand-core"
                    aria-hidden
                  />
                  Payroll
                </div>
                <div className="space-y-2">
                  <FieldRow
                    label="Holder"
                    value={holder}
                    placeholder="Account holder"
                    filled={holder.length > 0}
                  />
                  <FieldRow
                    label="Bank"
                    value={bankLine}
                    placeholder="Bank · account"
                    filled={bankFilled}
                  />
                  <FieldRow
                    label={snapshot.bankCodeLabel}
                    value={bankCode}
                    placeholder={snapshot.bankCodeLabel}
                    filled={bankCode.length > 0}
                  />
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5">
          <Phone className="h-3 w-3 text-muted-foreground" aria-hidden />
          <p className="text-micro text-muted-foreground">
            Live preview · updates as you type
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export const ProfilePreview = memo(ProfilePreviewInner, (prev, next) => {
  return (
    prev.stepId === next.stepId &&
    prev.className === next.className &&
    previewSnapshotsEqual(prev.snapshot, next.snapshot)
  );
});
