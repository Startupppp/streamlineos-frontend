"use client";

import { useState, useCallback } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordSocialMetrics } from "@/lib/api/hooks/marketing";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PLATFORMS } from "./platform-stats";

interface LogMetricsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function LogMetricsSheet({ open, onClose }: LogMetricsSheetProps) {
  const today = new Date().toISOString().split("T")[0];
  const [platform, setPlatform] = useState<string>("linkedin");
  const [metricDate, setMetricDate] = useState(today);
  const [followers, setFollowers] = useState("");
  const [impressions, setImpressions] = useState("");
  const [engagements, setEngagements] = useState("");
  const [clicks, setClicks] = useState("");
  const [shares, setShares] = useState("");
  const [comments, setComments] = useState("");
  const [reach, setReach] = useState("");

  const { mutate, isPending } = useRecordSocialMetrics();

  const reset = useCallback(() => {
    setPlatform("linkedin");
    setMetricDate(today);
    setFollowers("");
    setImpressions("");
    setEngagements("");
    setClicks("");
    setShares("");
    setComments("");
    setReach("");
  }, [today]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!platform || !metricDate || !followers) return;

      mutate(
        {
          platform,
          metricDate,
          followers: Number(followers),
          impressions: impressions ? Number(impressions) : 0,
          engagements: engagements ? Number(engagements) : 0,
          clicks: clicks ? Number(clicks) : 0,
          shares: shares ? Number(shares) : 0,
          comments: comments ? Number(comments) : 0,
          reach: reach ? Number(reach) : 0,
        },
        {
          onSuccess: () => {
            toast.success("Metrics recorded successfully");
            reset();
            onClose();
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }
      );
    },
    [
      platform,
      metricDate,
      followers,
      impressions,
      engagements,
      clicks,
      shares,
      comments,
      reach,
      mutate,
      reset,
      onClose,
    ]
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onClose();
    },
    [onClose]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Log Social Metrics
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sm-platform" className="text-xs font-medium">
              Platform <span className="text-destructive">*</span>
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger
                id="sm-platform"
                className="text-sm"
                aria-label="Select platform"
              >
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.filter((p) => p.value !== "all").map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sm-date" className="text-xs font-medium">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-date"
              type="date"
              value={metricDate}
              onChange={(e) => setMetricDate(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sm-followers" className="text-xs font-medium">
              Followers <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-followers"
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              placeholder="0"
              className="text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  id: "sm-impressions",
                  label: "Impressions",
                  val: impressions,
                  set: setImpressions,
                },
                {
                  id: "sm-engagements",
                  label: "Engagements",
                  val: engagements,
                  set: setEngagements,
                },
                {
                  id: "sm-clicks",
                  label: "Clicks",
                  val: clicks,
                  set: setClicks,
                },
                {
                  id: "sm-shares",
                  label: "Shares",
                  val: shares,
                  set: setShares,
                },
                {
                  id: "sm-comments",
                  label: "Comments",
                  val: comments,
                  set: setComments,
                },
                {
                  id: "sm-reach",
                  label: "Reach",
                  val: reach,
                  set: setReach,
                },
              ] as const
            ).map(({ id, label, val, set }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs font-medium">
                  {label}
                </Label>
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || !platform || !metricDate || !followers}
            >
              {isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Saving…
                </>
              ) : (
                "Log Metrics"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
