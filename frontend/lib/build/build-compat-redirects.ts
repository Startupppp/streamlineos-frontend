export interface CompatRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

export const BUILD_COMPAT_REDIRECTS: readonly CompatRedirect[] = [
  { source: "/build/assigned", destination: "/build/my-work", permanent: false },
  { source: "/build/freelancer", destination: "/build/my-work", permanent: false },
  { source: "/build/drafts", destination: "/build/my-work?section=drafts", permanent: false },
  { source: "/build/budget", destination: "/build/all-work?view=budgets", permanent: false },
  { source: "/build/reports", destination: "/build/all-work?view=reports", permanent: false },
];
