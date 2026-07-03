# StreamlineOS Product Bible

# Knowledge Module

# 14_Performance_Security_And_Compliance.md

## Performance Goals

- Knowledge home loads under 2 seconds for typical orgs.
- Article view loads under 1.5 seconds after route transition.
- Article tree supports 5,000 articles per organization with pagination/lazy loading.
- Search returns under 700ms for keyword search on normal data volumes.
- Autosave should not block typing.
- Import preview for 1,000 articles completes asynchronously without blocking the UI.

## Query Rules

- Select only needed fields for lists.
- Load article content only on article detail/editor routes.
- Paginate every list.
- Avoid N+1 by joining required owner/space metadata.
- Use indexes listed in database design.
- Cache public help center published article reads.
- Do not share-cache permission-specific internal article responses.

## Caching

Use existing cache infrastructure:

- TanStack Query for client state.
- Server cache or Redis where appropriate.
- Explicit invalidation on mutation.

Cache keys must include:

- Organization.
- User where permission-specific.
- Space/article IDs.
- Query filters.

Never cache:

- User-specific private notes in shared cache.
- Permission-specific article lists without user scoping.
- AI answers unless scoped by user and permission version.

## Security

Required:

- Session check on every protected route.
- Server-side permission check on every read/write.
- Zod validation.
- Sanitized HTML.
- Safe file upload validation.
- Rate limiting for public help center search/AI.
- Audit permission and public-publish changes.
- No hard-coded secrets.
- No raw SQL string interpolation.

## XSS Protection

- Store canonical editor JSON.
- Sanitize rendered HTML.
- Strip scripts, event handlers, unsafe styles, unsafe iframes.
- Validate links.
- Add rel attributes for external links.

## File Security

- Validate mime type and extension.
- Enforce size limits by plan.
- Use signed URLs for private attachments.
- Public article attachments must be explicitly public-safe.
- Scan files if scanning infrastructure exists; otherwise restrict dangerous types.

## AI Security

- Retrieval must filter by permissions before prompting.
- Prompt must include instruction not to reveal hidden content.
- Citations must be permission checked.
- AI logs must avoid storing sensitive full prompts where compliance requires.
- Respect AI usage quotas and top-ups.

## Compliance

MVP:

- Audit log.
- Soft delete.
- Export metadata.
- Access logs for public publishing.

Future enterprise:

- Legal hold.
- Retention policy by space.
- Data residency.
- eDiscovery export.
- SSO/SCIM ownership sync.
- Advanced DLP checks.

## Abuse And Rate Limits

Rate limit:

- Public article views if abused.
- Public search.
- Public AI.
- Article creation bursts.
- Attachment uploads.
- Import jobs.
- Export jobs.

## Data Loss Prevention

MVP guardrails:

- Warn before publishing public article containing internal-only linked records.
- Warn before exporting private/team spaces.
- Block public publish if article contains private attachments.
- Block AI public help answers from internal spaces.
- Record public publish and export events in audit log.

## Acceptance Criteria

- Security tests cover unauthorized reads and writes.
- AI cannot retrieve inaccessible content.
- Public help endpoint exposes only public-safe fields.
- Performance-critical lists are indexed and paginated.
