import { redirect } from "next/navigation";

export default async function GoalDetailRedirectPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  redirect(`/projects/goal/${goalId}`);
}
