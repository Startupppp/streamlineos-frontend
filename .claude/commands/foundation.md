Read CLAUDE.md fully. This is the ONE-TIME foundation pass before page-by-page work. Explore the repo completely first. Show me a plan before changing anything.

1. Extract the exact design tokens (colors, typography, spacing, radius, shadows) from the landing, /signin and /signup pages into tailwind.config / globals.css, mapped to shadcn palette conventions.
2. Audit components/ui/ (and @custom/, @shared/, @pre-ui/ if present): ensure Button, Input, Select, Card, Dialog, Sheet, Table, Badge, Skeleton, EmptyState, ErrorState exist and are styled purely from the tokens. Create missing ones minimally; fix off-palette ones.
3. Create/fix the app shell: sticky full-height sidebar + header, main content area that scrolls independently. The sidebar must never scroll with page content.
4. Ensure lib/api/ structure, the QueryClient provider, Sonner toaster, and the requirePermission() auth utility exist.
5. Verify Redis caching setup for read-heavy data (add if absent).
6. Generate PAGES.md: every page in app/ grouped by feature, each with a [ ] checkbox, ordered with money-path pages first (trading, wallet, orders, KYC).

Do NOT touch feature pages in this pass.
