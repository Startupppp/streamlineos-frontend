
# 09 — A person present in both models is provably the same person

**What to build:** The link column stops being decorative.

The HR person model already carries a nullable link to the directory person, with a partial unique index on it. Nothing depends on it, so today a person can exist in both models with no proof they are the same human — and the two payroll generations, one keyed on HR people and one keyed on workers, have no join path between them.

No schema change is needed. The column exists; this ticket makes resolution use it and keeps it populated.

**Blocked by:** 08 — One way to resolve a person.

**Status:** ready-for-agent

- [ ] Resolution uses the link to prove a person present in both models is one human, rather than inferring it from a matching name or email.
- [ ] The link is populated whenever a person comes to exist in both models, on every path that can create that situation. Enumerate those paths rather than assuming there is one.
- [ ] A person in both models resolves to a single result, not two.
- [ ] A person in exactly one model still resolves. Neither model becomes mandatory.
- [ ] The partial unique index still holds — two HR people cannot link to the same directory person. A test asserts the conflict is refused rather than silently overwriting.
- [ ] No column is added, altered or dropped.
- [ ] The two payroll generations can be joined through the seam. Demonstrate it with a test that reaches an input keyed on one model from a run keyed on the other; that join being impossible is the concrete symptom this stream exists to remove.
