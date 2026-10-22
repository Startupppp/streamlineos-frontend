import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { publicApplicationStatusContract } from "@/lib/public-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicGetNoStore, type PublicApplicationStatus } from "@/lib/public-fetch";

type Props = { params: Promise<{ applicationToken: string }> };

const STATUS_TONE: Record<
  PublicApplicationStatus["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  received: "secondary",
  in_review: "secondary",
  interview: "default",
  offer: "default",
  hired: "default",
  rejected: "destructive",
};

const STATUS_LABEL: Record<PublicApplicationStatus["status"], string> = {
  received: "Received",
  in_review: "Under review",
  interview: "Interviewing",
  offer: "Offer",
  hired: "Hired",
  rejected: "Closed",
};

export default async function ApplicationStatusPage({ params }: Props) {
  const { applicationToken } = await params;
  const data = await publicGetNoStore<PublicApplicationStatus>(
    `/public/application-status/${applicationToken}`,
    undefined,
    publicApplicationStatusContract,
  );
  if (!data) return notFound();

  return (
    <main className="candidate-surface min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-balance">
              {data.candidateFirstName
                ? `Hello ${data.candidateFirstName}`
                : "Your application"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Applied for</p>
              <p className="font-medium text-sm break-words">{data.jobTitle}</p>
              <p className="text-xs text-muted-foreground break-words">
                {[data.organisationName, data.jobLocation].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="space-y-2">
              <Badge variant={STATUS_TONE[data.status]} className="text-sm px-3 py-1">
                {STATUS_LABEL[data.status]}
              </Badge>
              <p className="text-sm text-muted-foreground">{data.statusText}</p>
            </div>

            
            {(data.bookingUrl || data.offerUrl) && (
              <div className="flex flex-col sm:flex-row gap-2">
                {data.bookingUrl && (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={data.bookingUrl}>Choose an interview time</Link>
                  </Button>
                )}
                {data.offerUrl && (
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href={data.offerUrl}>View your offer</Link>
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground mb-0.5">Applied on</p>
                <p className="font-medium font-mono tabular-nums">
                  {data.appliedAt ? format(new Date(data.appliedAt), "dd MMM yyyy") : "—"}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground mb-0.5">Last updated</p>
                <p className="font-medium font-mono tabular-nums">
                  {format(new Date(data.updatedAt), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
