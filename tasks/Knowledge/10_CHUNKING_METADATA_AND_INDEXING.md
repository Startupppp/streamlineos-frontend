# Chunking Metadata And Indexing

## Chunking Strategy

Chunk by:

- Document structure.
- Heading hierarchy.
- Section boundaries.
- Paragraphs.
- Tables.
- Page markers.

Avoid:

- Random fixed chunks only.
- Splitting tables without context.
- Losing heading/title context.
- Losing page numbers.

## Chunk Metadata

Each chunk stores:

- Org ID.
- Article ID.
- Version ID.
- Source document ID.
- Space ID.
- Collection ID.
- Heading path.
- Page number.
- Section title.
- Chunk index.
- Chunk hash.
- Language.
- Tags.
- Trust state.
- Verification date.
- ACL hash.

## Re-indexing Rules

Re-index when:

- Article published.
- Article updated.
- File replaced.
- Permissions changed.
- Article moved.
- Article archived/deleted.
- Verification state changed.
- Embedding model changed.

## Incremental Indexing

- Hash chunks.
- Reuse embeddings for unchanged chunks.
- Delete stale embeddings.
- Keep old versions for audit if configured.

## Acceptance Criteria

- Updated article returns updated answer.
- Deleted article is not retrieved.
- Permission change affects retrieval without full re-ingestion when possible.

