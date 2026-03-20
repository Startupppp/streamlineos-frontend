import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function AccountDeactivatedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#0f2b7f]/10">
          <ShieldOff className="h-10 w-10 text-[#0f2b7f]" />
        </div>

        <h1 className="text-2xl font-bold text-[#0f2b7f]">
          Account Deactivated
        </h1>

        <p className="mt-3 text-gray-600">
          Your account has been deactivated. Please contact your administrator
          to restore access.
        </p>

        <Link
          href="/signin"
          className="mt-8 inline-block rounded-lg bg-[#bd882c] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a67725]"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
