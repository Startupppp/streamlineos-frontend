import { cn } from "@/lib/utils";

/** Decorative rocket mark for the org-setup welcome hero — brand blue palette. */
export function WelcomeRocket({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)} aria-hidden>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full origin-center rotate-45"
      >
        <circle cx="60" cy="60" r="54" fill="url(#rocketGlow)" />
        <ellipse cx="34" cy="88" rx="16" ry="9" fill="white" fillOpacity="0.95" />
        <ellipse cx="44" cy="84" rx="10" ry="7" fill="white" fillOpacity="0.95" />
        <ellipse cx="86" cy="90" rx="14" ry="8" fill="white" fillOpacity="0.9" />
        <ellipse cx="76" cy="86" rx="9" ry="6" fill="white" fillOpacity="0.9" />
        <path
          d="M60 18c10 12 14 28 14 42 0 10-2.5 18-6 24H52c-3.5-6-6-14-6-24 0-14 4-30 14-42Z"
          fill="url(#rocketBody)"
        />
        <circle cx="60" cy="48" r="9" fill="#EFF6FF" />
        <circle cx="60" cy="48" r="6" fill="url(#windowGrad)" />
        <path d="M46 72c-8 4-14 14-14 22 8-2 14-6 18-12l-4-10Z" fill="#1E40AF" />
        <path d="M74 72c8 4 14 14 14 22-8-2-14-6-18-12l4-10Z" fill="#1E40AF" />
        <path d="M54 84c2 10 6 16 6 16s4-6 6-16H54Z" fill="url(#flame)" />
        <circle cx="28" cy="36" r="1.5" fill="#60A5FA" />
        <circle cx="92" cy="42" r="1.2" fill="#3B82F6" />
        <path
          d="M90 28l1.2 2.6 2.8.4-2 2 0.5 2.8L90 34.4 87.5 35.8l.5-2.8-2-2 2.8-.4L90 28Z"
          fill="#93C5FD"
        />
        <path
          d="M26 52l.9 1.9 2.1.3-1.5 1.5.4 2.1L26 56.6 24.1 58l.4-2.1-1.5-1.5 2.1-.3L26 52Z"
          fill="#60A5FA"
        />
        <defs>
          <radialGradient
            id="rocketGlow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(60 60) scale(54)"
          >
            <stop stopColor="#DBEAFE" />
            <stop offset="1" stopColor="#EFF6FF" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="rocketBody"
            x1="60"
            y1="18"
            x2="60"
            y2="84"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#60A5FA" />
            <stop offset="0.55" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient
            id="windowGrad"
            x1="54"
            y1="42"
            x2="66"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient
            id="flame"
            x1="60"
            y1="84"
            x2="60"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FDBA74" />
            <stop offset="0.5" stopColor="#F97316" />
            <stop offset="1" stopColor="#EF4444" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
