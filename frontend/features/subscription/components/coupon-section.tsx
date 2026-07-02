"use client";

import { Check, Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponValidationResult } from "@/hooks/api/subscription";

interface CouponSectionProps {
  couponInput: string;
  appliedCoupon: CouponValidationResult | null;
  couponResult: CouponValidationResult | undefined;
  isValidatingCoupon: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function CouponSection({
  couponInput,
  appliedCoupon,
  couponResult,
  isValidatingCoupon,
  onInputChange,
  onApply,
  onRemove,
}: CouponSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Have a coupon code?</p>
      </div>
      {appliedCoupon ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 flex-1">{appliedCoupon.message}</p>
          <button
            type="button"
            onClick={onRemove}
            className="text-emerald-600 hover:text-emerald-800 rounded"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={couponInput}
            onChange={onInputChange}
            placeholder="Enter coupon code"
            className="max-w-xs font-mono uppercase text-sm"
            aria-label="Coupon code"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onApply}
            disabled={couponInput.trim().length < 3 || isValidatingCoupon}
          >
            {isValidatingCoupon ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      )}
      {couponInput.trim().length >= 3 &&
        !appliedCoupon &&
        couponResult &&
        !isValidatingCoupon &&
        !couponResult.valid && (
          <p className="text-xs text-destructive">{couponResult.message}</p>
        )}
    </div>
  );
}
