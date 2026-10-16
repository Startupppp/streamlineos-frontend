import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotFoundIllustration } from "@/components/illustrations";

export default function EmployeeNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[60dvh]">
      <NotFoundIllustration className="mx-auto mb-6 h-44 w-44 sm:h-52 sm:w-52" />
      <div className="max-w-md space-y-3">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Employee not found</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          This employee doesn&apos;t exist, or you don&apos;t have access to their profile.
        </p>
      </div>
      <Button asChild size="lg" className="mt-10 min-w-[200px]">
        <Link href="/hr/employees">
          <Users className="mr-2 h-4 w-4" />
          Back to directory
        </Link>
      </Button>
    </div>
  );
}
