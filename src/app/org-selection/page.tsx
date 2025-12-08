import { OrganizationList } from "@clerk/nextjs";

export default function OrgSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Select Organization
        </h1>
        <p className="text-zinc-400">
          Please select or create an organization to continue to the CRM.
        </p>
        <div className="flex justify-center bg-white rounded-xl p-6 shadow-2xl">
            <OrganizationList 
                hidePersonal={true}
                afterSelectOrganizationUrl="/dashboard"
                afterCreateOrganizationUrl="/dashboard"
            />
        </div>
      </div>
    </div>
  );
}
