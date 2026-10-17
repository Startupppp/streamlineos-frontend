# Knowledge Base — Round 1 coverage (QA1015)

Tester session: account adityachalla01, org "ADitay CAhala", ~2026-10-15 IST.
Module surfaces: Ask KB `/knowledge/chat`, Wiki `/knowledge/wiki`, Research Briefs `/knowledge/research-briefs`.

## Tested

- Spaces CRUD (create Internal/Public, edit name, archive; restore attempted)
- Articles (create from Wiki home and from space detail, publish Draft → Published)
- Editor and slash menu (typing, `/` commands, headings/lists)
- Image upload (valid PNG, duplicate in-flight)
- PDF / file upload (valid PDF attach)
- Exe rejection (qa-test.exe disallowed type)
- Version history and restore (history UI; restore attempted with only one version)
- Share Private / Team / Public
- Public link anonymous access and revoke (HTTP 200 then 404; see KB-B-011)
- Search exact, partial/prefix, special characters, 300-character query
- Comments CRUD (post, edit, resolve; delete attempted)
- Templates Use (starter FAQ) and Save as template
- Move between spaces (Page info → Space; Move control behaviour noted)
- Ask KB (scoped question + Sources)
- Import Markdown (.md import job)
- Back / Forward browser navigation
- Autosave (repeated edits over the session)

## Not tested

- Second-user permission access (non-owner / other org member)
- Mixed audience (space or page)
- Research Briefs behaviour (`/knowledge/research-briefs`)

## Pass recorded for coverage

- KB-B-011: Public share link works anonymously; revoke returns 404 (token not logged).
