# 58 — The transaction-callback gate judges each test block, not the whole file

**What to build:** The gate reporting compliance with BE-136 stops certifying files on behalf of methods nobody tests. Its verdict function tests its exemption pattern against **the entire file text**, so a single assertion that the transaction was never called — anywhere in a 570-line spec — promotes every bare transaction double in that file out of the void bucket. One isolation spec earns the exemption with 14 bare doubles, while the module's only transactional write has no test at all. The gate positively asserts that file satisfies the rule.

The docblock claims the verdict is a property of the double. That is true per double, but the verdict the gate *acts on* is per file, and those are not the same property. A reader doing the right thing — running the gate, reading its output — is led away from the gap, which is strictly worse than having no gate.

Ticket 57 lands first so the change-request spec has a real invoking double before the unit tightens; otherwise this change turns a false green into a red that is nobody's fault.

**Blocked by:** 57 — The change-request number counter becomes a module whose concurrency is testable.

**Status:** ready-for-agent

- [ ] The gate's unit of judgement is the test block, not the file
- [ ] An exemption assertion in one block does not exempt doubles in another, proved by a self-test with both in one fixture file
- [ ] The counts change, and the new numbers are recorded as the baseline with the old ones noted as wrong rather than improved
- [ ] The gate's output distinguishes "a double that invokes its callback" from "a file that mentions not being called"
- [ ] The docblock states the unit it actually uses
