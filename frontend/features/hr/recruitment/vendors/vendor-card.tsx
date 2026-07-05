"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Copy, Link2 } from "lucide-react";
import { useGenerateVendorPortalLink, type RecruitmentVendor } from "@/hooks/api";

interface VendorCardProps {
  vendor: RecruitmentVendor;
  isHr: boolean;
  onEdit: (v: RecruitmentVendor) => void;
  onViewSubmissions: (v: RecruitmentVendor) => void;
  onDelete: (id: number) => void;
}

const CONTRACT_TYPE_LABEL: Record<RecruitmentVendor["contractType"], string> = {
  CONTINGENCY: "Contingency",
  CONTRACT_STAFFING: "Contract Staffing",
  BOTH: "Contingency + Contract",
};

export function VendorCard({ vendor, isHr, onEdit, onViewSubmissions, onDelete }: VendorCardProps) {
  const generateLink = useGenerateVendorPortalLink(vendor.id);
  const [portalLink, setPortalLink] = useState<string | null>(null);

  const handleEditClick = useCallback(() => onEdit(vendor), [onEdit, vendor]);
  const handleSubmissionsClick = useCallback(() => onViewSubmissions(vendor), [onViewSubmissions, vendor]);
  const handleDeleteClick = useCallback(() => onDelete(vendor.id), [onDelete, vendor.id]);

  const handleGenerateLink = useCallback(async () => {
    try {
      const result = await generateLink.mutateAsync();
      const link = `${window.location.origin}/vendor-portal/${result.portalToken}`;
      setPortalLink(link);
      await navigator.clipboard.writeText(link);
      toast.success("Portal link generated and copied — valid for 30 days");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [generateLink]);

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{vendor.name}</p>
            {vendor.contactName && <p className="text-xs text-muted-foreground">{vendor.contactName}</p>}
          </div>
          <Badge variant={vendor.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] shrink-0">
            {vendor.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">{vendor.submissionCount}</p>
            <p className="text-[10px] text-muted-foreground">Submissions</p>
          </div>
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">{vendor.placements}</p>
            <p className="text-[10px] text-muted-foreground">Placed</p>
          </div>
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">${parseFloat(vendor.revenueTotal || "0").toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {vendor.contactEmail && <p>{vendor.contactEmail}</p>}
          {vendor.feePercent && <p>Fee: {parseFloat(vendor.feePercent)}%</p>}
          <p>{CONTRACT_TYPE_LABEL[vendor.contractType]}{vendor.slaDays ? ` · SLA ${vendor.slaDays}d` : ""}</p>
        </div>

        {portalLink && (
          <div className="flex items-center gap-1.5">
            <Input readOnly value={portalLink} className="h-7 text-[11px]" />
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handleSubmissionsClick}>Submissions</Button>
          {isHr && (
            <>
              <Button size="sm" variant="outline" onClick={handleEditClick}>Edit</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleGenerateLink} disabled={generateLink.isPending}>
                {portalLink ? <Copy className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                {generateLink.isPending ? "Generating…" : "Portal Link"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeleteClick} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
