import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataHubContent } from "@/features/settings/data-hub/data-hub-content";

export default async function DataHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const moduleKey = typeof params.module === "string" ? params.module : null;

  return (
    <PageWrapper
      title="Data Import / Export Hub"
      subtitle="Centralized hub for importing data into and exporting data from the platform"
    >
      <DataHubContent defaultModule={moduleKey} />
    </PageWrapper>
  );
}
