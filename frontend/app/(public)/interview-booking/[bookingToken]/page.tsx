"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InterviewBookingExpiredError,
  useConfirmInterviewBooking,
  usePublicInterviewBooking,
} from "@/hooks/api/public-booking";
import { getErrorMessage } from "@/lib/get-error-message";

export default function InterviewBookingPage() {
  const params = useParams<{ bookingToken: string }>();
  const bookingToken = params.bookingToken;

  const bookingQuery = usePublicInterviewBooking(bookingToken);
  const confirmMutation = useConfirmInterviewBooking(bookingToken);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const isExpired = bookingQuery.error instanceof InterviewBookingExpiredError;
  const isSuccess = confirmMutation.isSuccess;
  const data = bookingQuery.data;

  const handleConfirm = useCallback(() => {
    if (!selectedSlot) return;
    confirmMutation.mutate({ slotStart: selectedSlot });
  }, [selectedSlot, confirmMutation]);

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSuccess ? "Interview Confirmed!" : "Schedule Your Interview"}
          </h1>
          {data && !isSuccess && (
            <p className="text-white/80 text-sm mt-1">{data.orgName}</p>
          )}
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {bookingQuery.isLoading && (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-32 bg-muted rounded animate-pulse" />
            </div>
          )}

          {isExpired && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-foreground">
                Link Expired
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This booking link has expired or has already been used. Please
                contact the recruiter for a new link.
              </p>
            </div>
          )}

          {bookingQuery.isError && !isExpired && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-2">
                {getErrorMessage(bookingQuery.error) || "Failed to load booking details."}
              </p>
            </div>
          )}

          {confirmMutation.isError && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {getErrorMessage(confirmMutation.error) || "Failed to book."}
            </p>
          )}

          {bookingQuery.isSuccess && data && !isSuccess && (
            <>
              <div className="mb-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Hi <strong>{data.candidateName}</strong>, please select a time
                  for your{" "}
                  <strong>
                    {data.interviewType.toLowerCase().replace("_", " ")}
                  </strong>{" "}
                  interview ({data.durationMinutes} min):
                </p>
                {data.notes && (
                  <p className="text-xs text-muted-foreground italic">{data.notes}</p>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.availableSlots.map((slot) => {
                  const start = new Date(slot.start);
                  const isSelected = selectedSlot === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelectedSlot(slot.start)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm press-scale",
                        isSelected
                          ? "border-primary bg-status-info-surface font-semibold text-foreground"
                          : "border-border hover:border-border bg-white text-foreground",
                      )}
                    >
                      <span className="block font-medium">
                        {format(start, "EEEE, MMMM d, yyyy")}
                      </span>
                      <span className="text-muted-foreground">
                        {format(start, "h:mm a")} –{" "}
                        {format(new Date(slot.end), "h:mm a")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleConfirm}
                disabled={!selectedSlot || confirmMutation.isPending}
                className="mt-6 w-full h-11"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  "Confirm Interview"
                )}
              </Button>
            </>
          )}

          {isSuccess && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                Interview Scheduled!
              </p>
              {selectedSlot && (
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(selectedSlot),
                    "EEEE, MMMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                You will receive a confirmation email with further details.
                Thank you!
              </p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
