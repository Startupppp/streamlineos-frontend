# Architecture work instructions

- Execute [prd/completion-plan.md](prd/completion-plan.md), the only source of remaining work. The module PRDs have been consolidated; do not recreate them.
- Apply root and affected side-specific CLAUDE.md. Read reference evidence only for a named task; dated OPEN/FAIL/TODO wording does not create assignments.
- Recheck current source and exact acceptance before changing status. Implemented but unverified remains open.
- One editor owns each task and its files. The coordinator reserves shared auth/schema/cache/build/fixture resources and serializes plan updates and final integration.
- Resolve technical questions from source and the plan's standing answers. Record genuine missing human inputs once in ordinary chat; continue independent authorized tasks.
- Update task progress in place. Keep durable evidence in its existing store; do not create session reports, duplicate backlogs, history files or scratch Markdown.
