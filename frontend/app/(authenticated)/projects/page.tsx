import { redirect } from "next/navigation";

interface ProjectsRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProjectsRedirectPage({
  searchParams,
}: ProjectsRedirectPageProps) {
  const params = await searchParams;
  if (params.create === "1") {
    redirect("/projects/all?create=1");
  }
  redirect("/projects/command-center");
}
