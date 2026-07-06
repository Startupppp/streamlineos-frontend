# Testing And QA Plan

## Unit Tests

- Permission checks.
- Slug generation.
- Article tree movement.
- Version creation.
- Chunking.
- ACL hash generation.
- Search filters.
- Citation validation.

## Integration Tests

- Upload PDF, parse, index, ask.
- Article update triggers re-index.
- Permission change affects retrieval.
- Draft answer visible only to author.
- Public AI uses only public docs.
- Deleted article removed from retrieval.

## RAG Tests

- Golden question set.
- Citation accuracy.
- No-context fallback.
- Contradiction handling.
- Stale warning.
- Prompt injection resistance.
- Permission leakage.

## E2E Tests

1. Create space, article, publish, ask question, verify cited answer.
2. Upload PDF policy, ask policy question, receive page citation.
3. Restrict article, confirm unauthorized user cannot search/ask/cite it.
4. Mark source stale, answer warns user.
5. Public help AI answers only from public articles.

## UI QA

- Desktop.
- Mobile.
- Loading.
- Empty.
- Error.
- Permission denied.
- Indexing status.

