import { cn } from "@/lib/utils";

interface IllustrationProps {
  className?: string;
}

function Wrapper({ className, children }: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      className={cn("w-32 h-32 text-muted-foreground/40", className)}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function EmptyInboxIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Tray / Inbox */}
      <rect x="24" y="50" width="80" height="48" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M24 68h26l6-10h16l6 10h26" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Dashed lines - empty content */}
      <line x1="44" y1="80" x2="84" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.5" />
      <line x1="50" y1="88" x2="78" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.3" />
      {/* Floating dots above */}
      <circle cx="48" cy="38" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="64" cy="32" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="80" cy="38" r="2" fill="currentColor" opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyProjectsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Folder shape */}
      <path d="M22 42h30l6-8h48a4 4 0 014 4v52a4 4 0 01-4 4H22a4 4 0 01-4-4V46a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" />
      {/* Plus sign in center */}
      <line x1="64" y1="60" x2="64" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="54" y1="70" x2="74" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Small document peeking out */}
      <rect x="42" y="28" width="20" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="47" y1="35" x2="57" y2="35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="47" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    </Wrapper>
  );
}

export function EmptyTeamIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Center person */}
      <circle cx="64" cy="44" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M40 88a24 24 0 0148 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Left person (faded) */}
      <circle cx="30" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M16 82a14 14 0 0128 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      {/* Right person (faded) */}
      <circle cx="98" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M84 82a14 14 0 0128 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      {/* Dashed connection lines */}
      <path d="M48 56l-10 4" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
      <path d="M80 56l10 4" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyTasksIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Clipboard */}
      <rect x="32" y="24" width="64" height="80" rx="6" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="18" width="32" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
      {/* Empty checklist lines */}
      <rect x="42" y="46" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="58" y1="51" x2="82" y2="51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <rect x="42" y="64" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="58" y1="69" x2="76" y2="69" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <rect x="42" y="82" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="58" y1="87" x2="72" y2="87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyDocumentsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Back page */}
      <rect x="38" y="20" width="56" height="72" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      {/* Middle page */}
      <rect x="34" y="26" width="56" height="72" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {/* Front page */}
      <rect x="30" y="32" width="56" height="72" rx="4" stroke="currentColor" strokeWidth="2" />
      {/* Document lines */}
      <line x1="40" y1="50" x2="76" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="40" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <line x1="40" y1="70" x2="64" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      {/* Corner fold */}
      <path d="M72 32l14 14h-10a4 4 0 01-4-4V32z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </Wrapper>
  );
}

export function EmptyTimeIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Clock face */}
      <circle cx="64" cy="64" r="36" stroke="currentColor" strokeWidth="2" />
      <circle cx="64" cy="64" r="2" fill="currentColor" opacity="0.5" />
      {/* Clock hands */}
      <line x1="64" y1="64" x2="64" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="64" y1="64" x2="80" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Hour markers */}
      <line x1="64" y1="32" x2="64" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="96" y1="64" x2="92" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="64" y1="96" x2="64" y2="92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="32" y1="64" x2="36" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      {/* Dashed circle - no entries */}
      <circle cx="64" cy="64" r="44" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyExpensesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Receipt */}
      <path d="M36 22h56v84l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5V22z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Dollar sign */}
      <circle cx="64" cy="56" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M60 50a6 6 0 018 0c2 2 0 6-4 6s-6 4-4 6a6 6 0 008 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="64" y1="46" x2="64" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Lines below */}
      <line x1="46" y1="80" x2="82" y2="80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="50" y1="88" x2="78" y2="88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </Wrapper>
  );
}

export function EmptyDevicesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Laptop screen */}
      <rect x="24" y="28" width="80" height="52" rx="4" stroke="currentColor" strokeWidth="2" />
      {/* Screen content placeholder */}
      <rect x="34" y="38" width="60" height="32" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Laptop base */}
      <path d="M16 80h96l-8 12H24l-8-12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Keyboard line */}
      <line x1="48" y1="86" x2="80" y2="86" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Screen lines - empty */}
      <line x1="44" y1="50" x2="72" y2="50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" opacity="0.2" />
      <line x1="44" y1="58" x2="66" y2="58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" opacity="0.15" />
    </Wrapper>
  );
}

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Magnifying glass */}
      <circle cx="56" cy="52" r="24" stroke="currentColor" strokeWidth="2.5" />
      {/* Glass handle */}
      <line x1="73" y1="69" x2="96" y2="92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* X in the center - no results */}
      <line x1="48" y1="44" x2="64" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="64" y1="44" x2="48" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Small dots around */}
      <circle cx="28" cy="80" r="2" fill="currentColor" opacity="0.1" />
      <circle cx="100" cy="36" r="2" fill="currentColor" opacity="0.1" />
      <circle cx="22" cy="40" r="1.5" fill="currentColor" opacity="0.1" />
    </Wrapper>
  );
}

export function EmptyActivityIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Activity line */}
      <line x1="40" y1="28" x2="40" y2="100" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      {/* Circle nodes on the line */}
      <circle cx="40" cy="40" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="40" cy="64" r="6" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <circle cx="40" cy="88" r="6" stroke="currentColor" strokeWidth="2" opacity="0.15" />
      {/* Placeholder content lines */}
      <line x1="54" y1="38" x2="96" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <line x1="54" y1="44" x2="82" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
      <line x1="54" y1="62" x2="90" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="54" y1="68" x2="78" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
      <line x1="54" y1="86" x2="86" y2="86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="54" y1="92" x2="74" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.1" />
    </Wrapper>
  );
}

export function EmptyCalendarIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Calendar body */}
      <rect x="22" y="32" width="84" height="72" rx="6" stroke="currentColor" strokeWidth="2" />
      {/* Calendar top bar */}
      <line x1="22" y1="52" x2="106" y2="52" stroke="currentColor" strokeWidth="2" />
      {/* Calendar hooks */}
      <line x1="44" y1="24" x2="44" y2="38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="24" x2="84" y2="38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Empty date grid */}
      <rect x="32" y="60" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="48" y="60" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="64" y="60" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="80" y="60" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <rect x="32" y="78" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <rect x="48" y="78" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <rect x="64" y="78" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <rect x="80" y="78" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.1" />
    </Wrapper>
  );
}

export function EmptySprintIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      {/* Kanban columns */}
      <rect x="14" y="30" width="28" height="68" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <rect x="50" y="30" width="28" height="68" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <rect x="86" y="30" width="28" height="68" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      {/* Column headers */}
      <line x1="20" y1="42" x2="36" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="56" y1="42" x2="72" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <line x1="92" y1="42" x2="108" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      {/* Empty card placeholders */}
      <rect x="19" y="50" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
      <rect x="19" y="66" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
      <rect x="55" y="50" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
      {/* Arrow suggesting flow */}
      <path d="M44 64h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <path d="M80 64h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </Wrapper>
  );
}
