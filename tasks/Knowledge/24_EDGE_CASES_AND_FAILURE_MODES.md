# Edge Cases And Failure Modes

## Permission Edge Cases

- User asks AI after permission revoked.
- Article moved from public to private.
- Team membership changes after indexing.
- Citation clicked after access revoked.
- Draft content appears in index.

## Ingestion Edge Cases

- Corrupt PDF.
- Password-protected PDF.
- OCR fails.
- Table parsed poorly.
- File too large.
- Duplicate upload.
- Upload cancelled mid-index.

## RAG Edge Cases

- No relevant chunks.
- Contradictory sources.
- Stale source only.
- Unverified source only.
- Query asks for non-Knowledge facts.
- Prompt injection inside document.
- Citation mismatch.
- Reranker returns wrong chunk.

## UI Edge Cases

- Empty space.
- No permission.
- Indexing in progress.
- AI credits exhausted.
- Public help AI disabled.
- Article deleted while open.
- Conflict during edit.

## Required Behavior

- Fail closed for permissions.
- Prefer no answer over wrong answer.
- Show actionable errors.
- Log failures for review.

