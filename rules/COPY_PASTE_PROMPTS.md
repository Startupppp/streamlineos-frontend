# 💬 COPY-PASTE PROMPT STARTERS (Use These)

**Save these. Use them at the start of every task. Prevents rule repetition.**

---

## PROMPT STARTER #1: Starting Fresh Task (General)

```
I'm following the Memory Pin rules as my foundation. Here are the core rules I'll maintain:

**Architecture**: Max 500 lines/file, descriptive param names [employeeId] not [id], 
server components default, middleware for auth, TanStack Query for all async.

**Code Quality**: Strict TypeScript (no any), named handlers only (useCallback), 
no comments, no dead code, proper keys in lists.

**UI/UX**: PageWrapper on every page, shadcn components only, no overlapping padding, 
partial skeletons, ConfirmDialog for destructive actions.

**Task**: [Bug #X: Description]

**My Plan** (using Task Breakdown Template):
- Current state: [1-2 lines]
- Root cause: [1-2 lines]
- Changes: [3-5 bullet points]
- Testing: [3-4 scenarios]

Starting implementation. Keeping Quick Reference open for rule lookups and patterns.
```

---

## PROMPT STARTER #2: Bug Fix Task

```
Following Memory Pin rules. Fixing Bug #[X]: [Name]

**Analysis** (from Task Breakdown Template):
- Steps to reproduce: [1-2 steps]
- Expected: [what should happen]
- Actual: [what's broken]
- Root cause: [why it's broken]

**Changes**:
1. [File path] → [Change]
2. [File path] → [Change]
3. [File path] → [Change]

**Cache strategy**: [Direct update / Invalidate + refetch / Optimistic]
**Testing**: Happy path, error path, edge cases

Using Task Template bug fix section. Quick Reference for patterns.
```

---

## PROMPT STARTER #3: Feature Add Task

```
Following Memory Pin rules. Adding feature: [Name]

**Scope**:
- User story: [1 sentence]
- Acceptance criteria: [3-5 bullets]

**Files involved**:
- New: [paths]
- Modify: [paths]
- Delete: [paths]

**API changes**: [POST /api/... with Zod schema details]
**Cache strategy**: [For mutations]
**UI**: [Component changes]

Using Task Template feature add section. Keeping Quick Reference visible.
```

---

## PROMPT STARTER #4: Refactor/Code Quality Task

```
Following Memory Pin rules. Refactoring: [What]

**Problem**: [Current issue]
- File: [path] ([size] lines)
- Issue: [what's wrong]

**Solution**:
1. Split file: [new component names]
2. Extract utils: [utilities.ts]
3. Fix spacing: [details]
4. Verify rules: [which rules apply]

**Verification**: Using Master Prompt checklist before pushing.
```

---

## PROMPT STARTER #5: Quick Question Mid-Task

```
Quick question on Memory Pin Rule [#X]: [Rule name]

Situation: [Context]
Memory Pin says: [What rule says]
My question: [Specific question]

Which approach should I take?
```

---

## PROMPT STARTER #6: After Implementation (Review)

```
Completed Bug #[X] using Task Breakdown Template.

**Changes made**:
1. [File] → [Change]
2. [File] → [Change]
3. [File] → [Change]

**Verification checklist** (Master Prompt):
- ✅ `pnpm build` passes
- ✅ `pnpm lint` passes  
- ✅ No file >500 lines
- ✅ Cache strategy: [Direct update / Invalidate]
- ✅ Mobile tested <640px
- ✅ All rules from Memory Pin followed

Ready for review. Quick Reference was open throughout.
```

---

## PROMPT STARTER #7: Multiple Tasks In Sequence

```
Following Memory Pin rules. Working on Bugs #1, #3, #5 today.

**Priority**: [Ordered by dependency]
- Bug #1: [Name] → [Est. time]
- Bug #3: [Name] → [Est. time]
- Bug #5: [Name] → [Est. time]

**Shared files**: [If any changes affect multiple bugs]
**Cache strategy**: [If mutations share queries]

Using Task Template for each. Quick Reference open. Will update after each.
```

---

## PROMPT STARTER #8: Asking for Pattern Review

```
Following Memory Pin. Implementing [Feature].

**Question about [specific pattern]**:
I see in Memory Pin: "use TanStack Query for all async".
For this mutation, should I: 
- A) Direct cache update: queryClient.setQueryData(...)
- B) Invalidate + refetch: queryClient.invalidateQueries(...)
- C) Optimistic update

Context: [Use case]
```

---

## PROMPT STARTER #9: When You're Stuck

```
Following Memory Pin. Working on [Task]. Hit a blocker.

**Issue**: [Description]
**Tried**: [What you've already tried]
**Memory Pin says**: [Relevant rule]
**My question**: [Specific question]

Which document should I check? (Master, Quick Ref, Task Template?)
Or is this a new rule?
```

---

## PROMPT STARTER #10: Team Rollout

```
Rolling out the Engineering Prompt System to team.

**Materials distributed**:
- ✅ Memory Pin (required reading)
- ✅ Quick Reference (keep open while coding)
- ✅ Master Prompt (link for detailed rules)
- ✅ Task Template (fill before every task)
- ✅ START_HERE guide

**Training plan**:
- Day 1: Everyone reads Memory Pin
- Day 2: First supervised bug fix together
- Day 3: 2 solo tasks with Quick Reference
- Day 4+: Standard practice

**Team checklist**:
- [ ] All members have files
- [ ] All members read Memory Pin
- [ ] First bug scheduled

Let's go.
```

---

## DO's AND DON'Ts

### ✅ DO
- **Mention the document**: "Memory Pin says..." or "Quick Reference shows..."
- **Reference specific rules**: "Rule #14: URL state for filters"
- **Fill Task Template first**: Shows you've planned
- **Keep Quick Reference visible**: Shows you know where rules live
- **Link to Master Prompt**: When detailed explanation needed

### ❌ DON'T
- **Repeat rules in chat**: Just say "I'm following Memory Pin"
- **Ask questions already answered in docs**: Check the documents first
- **Implement without planning**: Use Task Template every time
- **Push without verification**: Run through checklist first
- **Mention more than 1–2 documents per message**: Keeps context focused

---

## EXAMPLE: REAL USAGE

### Bad (No Structure)
```
"I'm fixing the 1-on-1 scheduling bug. The form shows error even with valid inputs. 
I think the field isn't binding correctly. Should I check the API endpoint? Also, 
should I use useEffect or TanStack Query? And how do I handle the response? Also, 
what about error messages?"
```
**Problems**: No planning, many questions, unclear scope, rule repetition.

### Good (Using System)
```
Following Memory Pin. Fixing Bug #1: 1-on-1 Scheduling validation error.

**Task Template analysis**:
- Current state: Form shows error with valid employee + date
- Root cause: Field binding mismatch OR API payload missing field
- Changes: (1) Fix field binding in form component, (2) Verify API payload, 
  (3) Add time field, (4) Improve error message
- Cache strategy: Update cache after successful mutation (TanStack Query)

Starting with form binding. Using Quick Reference for TanStack Query patterns.
```
**Benefits**: Clear scope, planned approach, right tool referenced, rule adherence shown.

---

## TEMPLATE CUSTOMIZATION

**Use this template for YOUR task type**:

1. Pick the relevant starter (#1, #2, #3, etc.)
2. Fill in [bracketed sections] with your task details
3. Keep it to 5–10 lines max
4. Reference the document you're using
5. Paste and execute

---

## MEMORY PIN MENTION (Required)

**Every task should start with**:
```
Following Memory Pin rules. 
```

**This signals**:
- You understand core rules
- You won't ask rule questions
- You'll use Quick Reference for lookups
- You've planned before coding
- You're following the system

**Saves**: 500–1000 tokens that would be spent repeating rules.

---

## QUICK REFERENCE MENTION (Recommended)

When mid-task:
```
Quick Reference shows the cache strategy template...
```

**This signals**:
- You know where to find patterns
- You're verifying against rules
- You're not guessing or improvising

---

## MASTER PROMPT MENTION (When Needed)

For detailed explanations:
```
See Master Prompt Phase 2 for architecture rules...
```

**This signals**:
- You've checked Quick Reference
- You need full context
- You're not spam-asking questions

---

## TASK TEMPLATE MENTION (Always)

Before starting:
```
Using Task Breakdown Template for planning.
```

After completing:
```
Completed using Task Template (bug fix section).
```

**This shows**: You're structured, you've planned, you've verified.

---

## FINAL CHECKLIST (Copy This)

Save this to your notes. Use before every message:

- [ ] Mentioned which document I'm using (Memory Pin, Quick Ref, etc.)
- [ ] Kept it to 10 lines or less
- [ ] Filled in specific task details (not generic questions)
- [ ] If asking a rule question, referenced where I checked first
- [ ] If implementing, mentioned Task Template
- [ ] If pushing code, mentioned verification checklist
- [ ] If asking for feedback, referenced specific rule

---

**Use these starters. Reference documents. Save tokens. Move fast.**
