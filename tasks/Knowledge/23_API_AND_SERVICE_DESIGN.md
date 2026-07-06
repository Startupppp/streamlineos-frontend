# API And Service Design

## Service Modules

- Space service.
- Article service.
- Permission service.
- Editor service.
- Upload service.
- Ingestion service.
- Chunking service.
- Embedding service.
- Search service.
- Retrieval service.
- Answer service.
- Citation service.
- Review service.
- Template service.
- Analytics service.
- Import/export service.
- Gap service.

## API Groups

- `/knowledge/spaces`
- `/knowledge/articles`
- `/knowledge/uploads`
- `/knowledge/search`
- `/knowledge/ask`
- `/knowledge/citations`
- `/knowledge/templates`
- `/knowledge/reviews`
- `/knowledge/gaps`
- `/knowledge/analytics`
- `/knowledge/settings`
- `/knowledge/import`
- `/knowledge/export`

## API Requirements

- Tenant-scoped.
- Permission-checked.
- Paginated.
- Filterable.
- Audited for sensitive actions.
- Idempotent for ingestion jobs.

## Background Jobs

- Parse upload.
- OCR.
- Chunk.
- Embed.
- Re-index.
- Expire verification.
- Generate analytics.
- Run RAG evals.

