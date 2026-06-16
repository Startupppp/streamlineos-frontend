Read CLAUDE.md fully and follow every rule in it. Fix this page: $ARGUMENTS

1. Explore the page completely: the page file, its components, hooks, types, API calls, route handlers and services it touches.
2. AUDIT first — show me a plan listing every violation of CLAUDE.md:
   - layout/spacing issues, off-palette styles, non-compact cards
   - missing/broken loading, empty (must fill available height), error states
   - sidebar/shell scrolling with the page, overflow/unnecessary scrollbars
   - Dialog used where a Sheet is needed (or vice versa)
   - duplicated or unnecessary components, cards, types, hooks, APIs
   - raw fetch/axios instead of TanStack Query hooks
   - route handler issues: missing Zod validation, fat handlers, inefficient DB calls, missing caching/invalidation, missing rate limiting or permission checks
   - missing feature pieces for this page's category, or pieces that should be removed
   - missing "Connect X" prompts for unconnected integrations
   - misplaced files that should move in the folder structure
   - type issues, anonymous handlers, comments, dead code
3. WAIT for my confirmation. Do not edit anything before I confirm.
4. After I confirm: fix everything per CLAUDE.md, delete dead files, run build + lint until clean, then mark this page done in PAGES.md with a one-line summary.
