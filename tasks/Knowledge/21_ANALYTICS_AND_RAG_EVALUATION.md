# Analytics And RAG Evaluation

## Analytics Dashboards

- Article views.
- Search success.
- No-result searches.
- AI questions.
- AI helpfulness.
- Citation usage.
- Knowledge gaps.
- Stale articles.
- Verification compliance.
- Support deflection.

## RAG Evaluation Metrics

- Retrieval precision.
- Retrieval recall.
- Citation accuracy.
- Answer helpfulness.
- No-context rate.
- Hallucination reports.
- Stale-source usage.
- Permission leakage tests.
- Latency.

## Golden Test Set

Admin can maintain:

- Question.
- Expected source articles.
- Expected answer points.
- Required citations.
- Forbidden sources.

## Evaluation Jobs

Run on:

- Model change.
- Chunking change.
- Reranker change.
- Major import.
- Scheduled QA.

## Acceptance Criteria

- RAG quality is measurable.
- Admin can see top failed questions.
- Failed evals block risky rollout if configured.

