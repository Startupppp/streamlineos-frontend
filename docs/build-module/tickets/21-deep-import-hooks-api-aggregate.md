# 21 — Deep-import the cross-module hooks aggregate

**What to build:** No Build module names the repository-wide hooks aggregate to reach one or two hooks. 23 Build files currently import from a surface that re-exports 22 domains — HR, CRM, chat, notifications and the rest — so a Build page's module graph includes hook code it will never call. Import the specific hook module instead; one Build page already does this correctly and is the pattern to follow.

Be honest about the expected gain: nothing here was measured. The framework's barrel optimisation is configured, but it covers 16 third-party packages and does not list the internal aggregates, and neither repository declares itself side-effect free. Treat the improvement as plausible rather than quantified, and do not claim a size reduction without measuring one.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No file under the Build feature tree imports from the repository-wide hooks aggregate
- [ ] Each import names the module that owns the hook
- [ ] No behaviour or rendering changes
- [ ] If a size claim is made, it is backed by a measurement, not inferred
