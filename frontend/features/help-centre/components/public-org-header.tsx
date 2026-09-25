import Link from "next/link";

interface PublicOrgHeaderProps {
  orgName: string;
  orgLogo: string | null;
  orgId: string;
}

export function PublicOrgHeader({ orgName, orgLogo, orgId }: PublicOrgHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center">
        <Link
          href={`/help/${orgId}`}
          className="flex items-center gap-2.5 min-w-0"
        >
          {orgLogo && (
            <img
              src={orgLogo}
              alt={`${orgName} logo`}
              className="h-8 w-8 rounded object-contain shrink-0"
              width={32}
              height={32}
            />
          )}
          {!orgLogo && (
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0"
            >
              <span className="text-primary font-bold text-sm select-none">
                {orgName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate">
            {orgName} Help Center
          </span>
        </Link>
      </div>
    </header>
  );
}
