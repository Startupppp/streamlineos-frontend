# 04 — Chatbot retrieval is permissioned and bounded

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Tenant, actor, space and record ACL predicates run before candidates reach the model.
- [ ] The model never receives permission tables, role names or grant history.
- [ ] Hybrid retrieval has hard caps on candidates, chunks, bytes and tokens.
- [ ] No eligible content short-circuits before embedding or generation.
- [ ] Citations re-resolve through direct-read visibility before response.
- [ ] Prompt-injection tests cannot widen retrieval.
- [ ] Cost, latency, tokens and model are recorded through the AI gateway.
