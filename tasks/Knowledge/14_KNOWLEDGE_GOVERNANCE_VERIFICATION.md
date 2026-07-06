# Knowledge Governance Verification

## Trust States

- Unverified.
- Verified.
- Verification expired.
- Deprecated.

## Ownership

Every published article should have:

- Owner.
- Reviewer optional.
- Review interval.
- Next review date.

## Verification Workflow

1. Article created.
2. Owner assigned.
3. Submitted for review.
4. Reviewer approves/rejects.
5. Article marked verified.
6. Review date scheduled.
7. Expiry triggers review.

## Review Tasks

Generated when:

- Verification expires.
- AI answer uses stale source.
- User reports wrong answer.
- Article has negative feedback.
- Duplicate/conflict detected.

## RAG Behavior

- Verified articles preferred.
- Expired articles can be used with warning.
- Deprecated articles should not be used unless explicitly scoped.

## Acceptance Criteria

- Users can see whether content is trusted.
- AI warns when answer relies on unverified/stale content.
- Admin can see verification compliance.

