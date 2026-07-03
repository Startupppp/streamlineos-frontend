import { redirect } from "next/navigation";

export default async function SupportKbArticleRedirectPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  redirect(`/kb/${articleId}`);
}
