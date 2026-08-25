# 02 — The article migration acquires an end date

**What to build:** A recorded answer to how much of the help-centre-article-to-wiki-page migration is left, and a written condition under which the migration code is deleted. Right now the migration stands alone in its own folder — which is what makes it obviously deletable — but nothing says when, and nobody knows whether the backlog is converging or refilling.

The most likely finding is that it is not a migration at all. The help centre is a live product; if articles are still being created, this is a permanent conversion tool wearing a migration's name, and it should be renamed to say so.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The count of unmigrated articles, per organisation and in total, is recorded in this ticket.
- [ ] Whether articles are still being created on the old shape is answered from the data, not assumed — and if they are, which surfaces create them.
- [ ] A written verdict: transition (drains to zero, gets an end date) or conversion tool (permanent, gets renamed).
- [ ] If it is a transition: the condition for deleting the migration code is written down.
- [ ] If it is a conversion tool: the folder and its module are renamed to say so, so nobody deletes it as finished work.
- [ ] No code behaviour changes in this ticket beyond a rename, if one is warranted.

## Todo

- [ ] Write and run the backlog query; record the numbers here
- [ ] Check article creation over a recent window to see whether the backlog refills
- [ ] Identify which surfaces still write articles
- [ ] Decide transition vs conversion tool and record the reasoning
- [ ] Execute the rename if that is the verdict
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
