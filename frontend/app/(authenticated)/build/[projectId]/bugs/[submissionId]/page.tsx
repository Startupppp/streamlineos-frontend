import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { serverGet } from "@/lib/server-fetch";

const intakeFeedbucketLookupContract = z.object({
  intakeId: z.number().int().nullable(),
});

const positiveInt = z.coerce.number().int().positive();

export default async function BugsSubmissionRedirectPage({
  params,
}: {
  params: Promise<{ projectId: string; submissionId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/bugs/[submissionId]");
  const { projectId, submissionId } = await params;

  const pidParsed = positiveInt.safeParse(projectId);
  const sidParsed = positiveInt.safeParse(submissionId);
  if (!pidParsed.success || !sidParsed.success) notFound();

  const pid = pidParsed.data;
  const sid = sidParsed.data;

  const result = await serverGet(
    `/build/${pid}/intake/by-feedbucket/${sid}`,
    intakeFeedbucketLookupContract,
  );

  if (result.intakeId !== null) {
    redirect(`/build/${pid}/intake?item=${result.intakeId}`);
  }
  redirect(`/build/${pid}/intake`);
}
