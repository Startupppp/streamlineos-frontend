import { redirect } from "next/navigation";

type Params = { slug: string };

export default async function BlogSlugRedirect({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  redirect(`/blogs/${slug}`);
}
