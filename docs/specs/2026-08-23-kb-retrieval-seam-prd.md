# Spec — The knowledge-base visibility predicate is one seam

Status: **ready-for-agent**
Date: 2026-08-23
Stream: P · Tickets P01–P04
Testing prerequisite: `2026-08-23-seeded-e2e-harness-prd.md`

## Problem Statement

A person asks the assistant a question and gets back the contents of a page they are not allowed to open.

Someone outside a project can open the wiki, search for that project's page, and be told it does not exist. Then they can ask the assistant the same question in the same session, and the assistant answers using that page's full text and cites it as a source. Two doors to the same room; one is locked and one is not.

The reverse is also wrong and less visible. A person who belongs to no project at all currently sees every project's pages — through both doors. They have never been told they are seeing something restricted, because from their side nothing looks restricted.

For someone administering the knowledge base, this means the visibility setting on a page does not mean what it says. They mark a page as belonging to a project, expecting that to limit who reads it, and it limits only one of the ways it can be read.

## Solution

One rule about who may read a page, applied everywhere a page is read.

The rule already exists and is already correct: an organisation page with no project is readable by the organisation, a page belonging to a project is readable by that project's members, and the person who wrote a page can always read their own. What is missing is that some readers of pages do not consult it.

After this, the assistant answers from exactly the pages the person could have opened themselves. A page belonging to a project is offered to that project's members and to nobody else. A person in no projects sees the organisation's shared pages and their own, which is what they were always meant to see.

The rule also becomes impossible to consult half-informed. Today it can be asked a question without being told who the reader is a member of, and it answers generously when it does not know. After this it cannot be asked without being told.

## User Stories

1. As an employee, I want the assistant to answer only from pages I could open myself, so that its answers do not leak work I am not part of.
2. As an employee, I want a cited source I can click through to, so that an answer is never built on something I then cannot read.
3. As an employee, I want search and the assistant to agree about what exists, so that the product does not contradict itself.
4. As a project member, I want my project's pages available to me in the assistant, so that the restriction does not make the feature useless for real work.
5. As a project member, I want pages from projects I am not on to stay out of my answers, so that my results are relevant as well as permitted.
6. As a page author, I want to read my own page whatever project it belongs to, so that I never lose access to my own writing.
7. As a page author, I want a page I mark as belonging to a project to actually be limited to that project, so that the setting is meaningful.
8. As a page author, I want to know that marking a page private keeps it out of everyone else's answers, so that drafts stay drafts.
9. As an employee in no projects, I want the organisation's shared pages, so that the knowledge base still works for me.
10. As an employee in no projects, I want not to be shown other teams' project pages, so that I am not accidentally handed something confidential.
11. As a knowledge-base administrator, I want visibility settings to behave identically in every surface, so that I can explain the product to my colleagues.
12. As a knowledge-base administrator, I want a page moved between projects to change who can read it immediately, so that reorganising does not leak.
13. As a knowledge-base administrator, I want a page's analytics to count only readers who were allowed to read it, so that the numbers mean something.
14. As an organisation owner, I want to read everything in my organisation, so that ownership still means what it means everywhere else.
15. As a person in another organisation, I want a page identifier from someone else's organisation to look like it does not exist, so that I cannot use the product to discover what exists.
16. As a commenter, I want to comment only on pages I can read, so that a comment thread cannot become a side channel into a restricted page.
17. As a person using page AI, I want AI actions offered only on pages I can read, so that a summarise button is not a way around a restriction.
18. As a person browsing linked records, I want links to show only pages I can read, so that a record's related-pages list is not an index of things I am denied.
19. As a person browsing the page tree, I want the tree to contain only what I can open, so that I am not shown a shape I cannot enter.
20. As a person restoring a deleted page, I want the deleted list to contain only pages I could have read, so that deletion does not become a disclosure.
21. As a support agent, I want the public help centre to keep working exactly as it does, so that customers are unaffected by an internal change.
22. As a customer reading the public help centre, I want to see published public articles, so that nothing about this change reaches me.
23. As a developer, I want one function that answers who may read a page, so that I do not have to find and match four copies.
24. As a developer, I want that function to refuse to compile when I have not told it who the reader is, so that I cannot get the wide answer by forgetting.
25. As a developer, I want the retrieval path and the read path to share the rule, so that fixing one fixes both.
26. As a developer, I want a test that fails when the two paths disagree, so that they cannot drift again.
27. As a developer, I want the assistant's retrieval to stay fast after the rule is applied, so that correctness does not cost the feature.
28. As a developer, I want the pieces of information the rule needs stored alongside what it filters, so that applying it is a cheap lookup rather than a join.
29. As a developer, I want re-indexing a moved page to update its stored access facts, so that a stale copy does not outlive the move.
30. As a developer, I want to know which product a knowledge-base file belongs to from its location, so that I stop editing the help centre when I meant the wiki.
31. As a developer, I want the article-to-page migration in a folder of its own, so that its end is visible and it can be deleted when it is done.
32. As a developer, I want retrieval, indexing and the visibility rule together in one place, so that the next person changing what comes back has one place to look.
33. As a reviewer, I want a change to who can read a page to be a change to one expression, so that I can review it.
34. As a security reviewer, I want the filter applied in the query rather than in the prompt, so that it cannot be talked around.
35. As a security reviewer, I want the filter applied before candidates are chosen and again when their content is fetched, so that a later step cannot re-widen an earlier one.
36. As a security reviewer, I want a person in no projects tested explicitly, so that the most permissive case is the one we prove.
37. As a security reviewer, I want an allow case beside every deny case, so that a passing test is not just a broken feature.
38. As an operator, I want this to need no maintenance window, so that it can ship on an ordinary day.
39. As an operator, I want any change to stored data done additively and in batches, so that a large organisation is not locked while it runs.

## Implementation Decisions

**One rule, and it is the existing one.** The expression that decides who may read a page keeps its name and its meaning. Nothing about the product rule changes; what changes is who consults it.

**The rule requires the reader's projects.** Its second input stops being optional. A caller that has not resolved which projects the reader belongs to cannot call it. This is the whole fix for the permissive case — the wide answer is currently what you get by forgetting.

**The no-projects case narrows.** With no projects, a reader sees organisation pages that belong to no project, plus their own pages. The project clause is added on top when there are projects; it never replaces a wider base. Today it is the reverse, which is why "I am in no projects" reads as "show me everything".

**Organisation owners keep their existing short-circuit**, evaluated before anything else, unchanged.

**"What can this person reach" has one owner.** The service that already answers which knowledge spaces a person can reach also answers which projects. No caller resolves this by querying project membership itself.

**Five read paths gain the reader's projects.** Analytics, page AI, comments, record links and the deleted-page listing currently ask the rule without saying who the reader belongs to. Each is given the answer. Narrowing them is the intent — but they must be given the projects at the same time, or a legitimate project member would lose access to their own project's pages, turning a disclosure fix into an outage.

**Indexing eligibility is a different question and is not touched.** Whether a page is indexable at all — is it private, is it archived, is it deleted — is decided at write time and already excludes private pages. Whether a given reader may receive it is decided at read time. Conflating them is how the two drifted.

**The access facts move onto the indexed content.** Each stored chunk carries the visibility, project and author of the page it came from, written when it is indexed and rewritten when the page is re-indexed. This turns the filter into an indexed lookup instead of a join back to the page table — and removes the join that made writing a second, weaker filter tempting. It is sequenced after correctness because it is an optimisation, not the fix.

**Any index supporting this filter must lead with the tenant column.** Row-level security adds a tenant condition that is not exempt from evaluation, so an index that omits the tenant column will simply not be used, which reads as "the index did not help".

**Stored-data changes are additive and staged** — add nullable, backfill in batches, tighten separately — each step bounded so it fails fast rather than queueing behind a long read and blocking the table.

**The module gains a shape, last.** The knowledge base is one flat folder of over a hundred files holding two products — a public help centre and an internal wiki — plus a migration between them. It nests by domain: shared core, help centre, wiki, retrieval, and migration. Two other modules in this codebase already have exactly this shape. This moves files, so it runs alone, after everything else.

## Testing Decisions

**A good test here names the person, the request and the page, and asserts what came back.** It does not assert which tables were read or in what order — the query strategy is precisely what this work is free to change, and a test that fails when a predicate is consolidated is testing the implementation.

**The primary seam is the controller, against seeded data.** This depends on the seeded harness spec. The existing controller harness replaces the access services with fixtures and connects to no database, so it structurally cannot fail on a row-level visibility bug — a spec written against it would pass whatever this stream did.

**The scenario that defines this work**, seeded once and asserted at the controller:

- An organisation with two projects, a page in each, and a shared page in neither.
- Ask the assistant as a member of project one: the project-one page is available, the project-two page is absent from both the answer and its cited sources, the shared page is available.
- Open the project-two page directly as the same person: not found.
- The two results agree. That agreement is the whole spec.

**The permissive case gets its own scenario.** A person in no projects asks the same question: neither project page appears. **This is the mutation check** — restore the old wide fallback and this fails while everything else still passes.

**Coverage the seeded harness must carry:**

- A project member receives their own project's page.
- A page author receives their own page from a project they do not belong to.
- An organisation owner receives everything.
- A private page reaches nobody but its author.
- A page moved between projects changes audience immediately, and after re-indexing its stored access facts match.
- A page identifier from another organisation returns not-found, never forbidden.
- The four previously-permissive surfaces — analytics, page AI, comments, record links — each refuse a page outside the reader's projects.
- The public help centre is unchanged for an anonymous reader.

**Service-level coverage stays as the drift fence.** A test that renders the predicate each retrieval query was built with and asserts it equals the shared rule runs in the default suite and fails the moment the two paths diverge. It is cheaper than the seeded scenario and catches the specific regression this stream exists to prevent. Both are wanted; they prove different things and the specs should say which.

**Prior art.** Fourteen knowledge-base controller e2e specs exist and are the model for shape, including ones for ask, search, pages and public pages. The existing indexing-eligibility spec must pass **unchanged** — if it needs editing, indexing was changed and the scope was wrong.

**A trap already paid for here.** These specs run only under the dedicated end-to-end command and are excluded from the default run, so adding a case is not the same as adding executed coverage.

## Out of Scope

- The public help-centre retrieval path and its separate access model. It serves published public articles to anonymous readers and is a different question.
- Merging the two retrieval implementations. The public widget path and the authenticated assistant path share no code and have different access models. Worth doing, worth its own spec.
- Changing what indexing eligibility means.
- Making a knowledge-base document render outside the knowledge base.
- Any change to the help centre's public behaviour.

## Further Notes

The first ticket in this stream is already done and committed: the assistant's retrieval queries now consult the shared rule. It does not close the problem on its own, because the rule is still permissive when it does not know the reader's projects — so retrieval and direct read are now consistent and both wider than intended for a person in no projects. The second ticket is the one that closes it and should lead.

The narrowing will make some visible numbers smaller for people in no projects — page counts, analytics totals, search result counts. That is the correction, not a regression, but it is worth knowing before someone reports it as a bug.
