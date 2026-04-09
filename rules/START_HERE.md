# 🚀 COMPLETE PROMPT SYSTEM GUIDE

**Everything you need to know to use the 4-document system efficiently.**

---

## 📖 What You've Got

| Document | Lines | Purpose | When to Use |
|----------|-------|---------|------------|
| **Master Prompt** | ~1200 | Complete reference with all rules, bugs, checklist | Full context needed, starting big refactor |
| **Quick Reference** | ~300 | Fast lookup table + templates | Middle of coding, 2-second reminder |
| **Memory Pin** | ~200 | Core rules only, prevents repetition | Start of every task, mention in chat |
| **Task Template** | ~500 | Structured planning format + 6 examples | Before implementing anything |

**Total:** ~2200 lines covering everything. Optimized for token efficiency.

---

## 🎯 GETTING STARTED (First Time)

### Step 0: Read This Document (5 min)
You're already doing it! Finish this section.

### Step 1: Skim Memory Pin (5 min)
Open `MEMORY_PIN.md`. Read the "Core Rules" section. This is your north star.

### Step 2: Bookmark Quick Reference (0 min)
Keep `QUICK_REFERENCE.md` open in another tab while coding.

### Step 3: Save Master Prompt Link
`MASTER_ENGINEERING_PROMPT.md` is your encyclopedia. Link it when needed.

### Step 4: Start First Task
Pick a bug from the 11 bugs list. Open `TASK_BREAKDOWN_TEMPLATE.md`. Fill it in. Go.

---

## 💬 HOW TO MENTION IN CHAT

### Pattern 1: Starting a New Task
```
I'm following the Master Engineering Prompt rules. 

Here's my plan for [Bug #3: Cycle Management]:
- Current state: [filled in]
- Root cause: [identified]
- Changes: [listed]
- Testing: [planned]

Starting implementation now. Using Quick Reference for rule lookups.
```

### Pattern 2: Asking for Feedback
```
I'm following Memory Pin rules (no unnecessary useEffect, named handlers, PageWrapper everywhere, etc.).

Fixed Bug #7 (Payslip Download) using this approach:
1. [Change 1]
2. [Change 2]
3. [Change 3]

Are these changes aligned with the architecture rules?
```

### Pattern 3: Hitting a Snag
```
Quick question on Rule #14 (URL state for filters). For the employees page:
- Should pagination be in URL (e.g., ?page=1&limit=20)?
- Or should I use TanStack Query cache?

Memory Pin says "URL state for filters" but I want to confirm for pagination.
```

**Key**: Always mention which document you're referencing. Don't repeat rules in chat; assume the AI knows them via the documents.

---

## 🔍 QUICK LOOKUP GUIDE

### "How do I structure a form?"
→ **Master Prompt** → Section "REACT RULES" → Rule 13–15 (TanStack Query, state management)
OR
→ **Task Template** → "Template: Add Missing Feature" section (Asset Status example)

### "Should I split this file?"
→ **Memory Pin** → "File Split Triggers" section
→ OR **Quick Reference** → Line 1 of "WHEN IN DOUBT"

### "How do I handle mutations?"
→ **Quick Reference** → "MUTATION CACHE STRATEGY" section
→ **Master Prompt** → "API & Mutation Checklist"

### "What's wrong with my form validation?"
→ **Task Template** → "Bug Fix template" → check "ROOT CAUSE" section pattern
→ **Quick Reference** → "QUICK FIXES" → "Fix Validation Error"

### "Is this UI correct?"
→ **Memory Pin** → "UI/UX Standards" section
→ **Master Prompt** → "UI/UX REFACTORING CHECKLIST" section

---

## 📋 TASK EXECUTION WORKFLOW

### For Any Task (5 Steps):

**STEP 1: Plan (5 min)**
- Open Task Template
- Fill in: Current State, Root Cause, Plan
- List files to create/modify/delete

**STEP 2: Implement (30–90 min)**
- Refer to Memory Pin for rules
- Refer to Quick Reference for syntax
- Code with checklist visible

**STEP 3: Test (10 min)**
- Happy path (valid inputs)
- Error path (network failure)
- Edge cases
- Mobile responsive

**STEP 4: Verify (5 min)**
- Run verification checklist from Master Prompt
- `pnpm build`, `pnpm lint`
- No `any`, no comments, no dead code

**STEP 5: Report (2 min)**
- Reference the task template you used
- Mention rules followed
- Ask for feedback with specific question

---

## 🐛 THE 11 BUGS (Reference)

Keep this list handy. Each bug is documented in all 4 documents.

1. **1-on-1 Scheduling** (HIGH) → Form validation error → Fix field binding + API payload
2. **Asset Status Dropdown** (MEDIUM) → Missing selector → Add Select component
3. **Cycle Management** (HIGH) → No preview/edit/delete → Add action menu
4. **Candidates "Apply to Job"** (MEDIUM) → Misplaced button → Move to Jobs module
5. **Create Deal Modal** (MEDIUM) → Cramped spacing → Replace with side sheet
6. **Create Organization Modal** (MEDIUM) → Same issue → Replace with side sheet
7. **Payslip Download** (HIGH) → Not working → Fix API + blob handling
8. **Helpdesk/Exit Visibility** (HIGH) → HR/CEO only → Enable for all employees
9. **Exit Workflow** (HIGH) → Missing steps → Implement resignation → HR approval → notifications
10. **Termination Email** (HIGH) → Not sent → Add email trigger
11. **Notice Period** (MEDIUM) → Editable + no auto-calc → Lock field, auto-calculate LWD

---

## ✅ ESSENTIAL RULES (Memorize These)

### Top 10 Rules (Never Break)
1. Max 500 lines per file (split with `_components/` or `features/`)
2. No `any` types, no `as Type` assertions → strict typing
3. Named handlers only → `const handleClick = useCallback(...)`
4. No comments → code should self-explain
5. No unnecessary `useEffect` → use `useMemo` for derived state
6. `PageWrapper` on every page (title, subtitle, actions, filters)
7. Shadcn components + color palette exclusively
8. TanStack Query for all async (document cache strategy)
9. Server components by default (only `"use client"` for interactivity)
10. `ConfirmDialog` for all destructive actions

### Top 5 Checks (Before pushing)
- [ ] `pnpm build` passes (zero TS errors)
- [ ] `pnpm lint` passes (zero warnings)
- [ ] No file >500 lines
- [ ] Mobile responsive (<640px tested)
- [ ] All bugs in scope fixed and tested

---

## 🎨 COLOR PALETTE (Shadcn)

Always use these colors. Never hardcode.

**Backgrounds**: `--color-background-primary`, `-secondary`, `-tertiary`  
**Text**: `--color-text-primary`, `-secondary`, `-tertiary`  
**Semantic**: `-info`, `-success`, `-warning`, `-danger`  

**Check**: Is your text visible on your background? If not, fix it. No AI-generated look.

---

## 🔄 CACHE STRATEGY (Every Mutation)

For every mutation, ask yourself: Update or Invalidate?

```typescript
// DIRECT UPDATE (fast, if you know the shape)
queryClient.setQueryData(['key'], (old) => [...old, newData]);

// INVALIDATE + REFETCH (slower, safer)
queryClient.invalidateQueries({queryKey: ['key']});
```

**Document which strategy in code comment for each mutation.**

---

## 📱 RESPONSIVE BREAKPOINTS

- **Mobile**: <640px (stack vertically, full width)
- **Tablet**: 640px–1024px (2-column grids)
- **Desktop**: >1024px (3–4 columns, sidebar visible)

Every page tested at all three.

---

## 🧪 TESTING CHECKLIST (Every Task)

- [ ] Happy path (valid inputs) → Success
- [ ] Error path (network fails) → Error toast
- [ ] Empty state (no data) → Empty state UI
- [ ] Loading state (pending) → Skeleton (partial, not full screen)
- [ ] Edge case 1 (e.g., long text) → Doesn't overflow, truncates properly
- [ ] Edge case 2 (e.g., missing field) → Validation error
- [ ] Mobile <640px → Layout stacks correctly
- [ ] Mobile touch target → 44px minimum
- [ ] Accessibility → Can tab through form, submit with Enter

---

## 🚀 FAST PATH (If You Know What You're Doing)

1. Open Task Template
2. Fill in: Scope, Current State, Plan (10 min)
3. Open Quick Reference
4. Code (30 min)
5. Run verification (5 min)
6. Report with template reference
7. Done

**Total time**: 45 min. Zero rule violations (because Quick Reference is open).

---

## 🆘 STUCK? HERE'S THE DECISION TREE

**"Is this a bug?"**  
→ Check the 11 bugs list. If yes → fill Task Template "Bug Fix" section.

**"Is this a new feature?"**  
→ Fill Task Template "Feature Add" section. Plan API first.

**"Is this a refactor?"**  
→ Identify which rule is violated. Reference that rule in Master Prompt.

**"Do I need to ask a question?"**  
→ Reference the specific rule/bug. "Memory Pin says X, but I think Y should apply here. What's your call?"

**"Am I over-complicating this?"**  
→ Check Memory Pin "QUICK DECISION TREE" section. Usually there's a simpler way.

---

## 💰 TOKEN EFFICIENCY MATH

### Without This System:
- Task starts: need to explain rules (500 tokens)
- Mid-task: ask a question, repeat context (400 tokens)
- Task ends: verify rules again (300 tokens)
- **Total**: ~1200 tokens per task

### With This System:
- Task starts: "Following Memory Pin. Here's my plan" (100 tokens)
- Mid-task: "Quick question on Rule #5 from Memory Pin. [specific Q]" (80 tokens)
- Task ends: "Used Master Prompt checklist. Verified all rules" (50 tokens)
- **Total**: ~230 tokens per task

**Savings**: ~970 tokens per task × 10 tasks = 9,700 tokens saved = $$

---

## 📝 TEMPLATE EXAMPLES

### Bug Fix Template (Filled)
```
BUG: Payslip Download Not Working

CURRENT STATE:
- File: app/api/v1/payroll/payslip/route.ts
- Issue: GET request returns 500 error

PLAN:
1. Check API endpoint:
   - Verify payload validation (month, employeeId)
   - Check database query (Drizzle)
   - Test with curl
2. Check frontend:
   - Verify useMutation setup
   - Handle blob response → download or preview
   - Show success/error toast
3. Add error handling:
   - Network failure
   - Invalid month/employee
   - Permission denied

ACCEPTANCE:
- [ ] Can download payslip
- [ ] Toast shows success/error
- [ ] Works with different months
- [ ] Handles errors gracefully
```

### Feature Add Template (Filled)
```
FEATURE: Asset Status Dropdown

CURRENT STATE:
- File: app/(dashboard)/hr/assets/_components/add-asset-form.tsx
- Issue: No status field

PLAN:
1. Update schema:
   - Add status: enum('AVAILABLE', 'ASSIGNED', 'MAINTENANCE')
   - Required: true
2. Update API:
   - Validate in Zod
   - Store in database
3. Update UI:
   - shadcn <Select> component
   - Default: AVAILABLE
   - Show in form
4. Test:
   - Submit with each status
   - Verify stored in DB

ACCEPTANCE:
- [ ] Status dropdown visible
- [ ] All 3 options available
- [ ] Defaults to AVAILABLE
- [ ] Validation works
```

---

## 🎓 LEARNING PATH (For Onboarding)

**Week 1: Foundations**
- Day 1: Read Memory Pin → understand core rules
- Day 2: Read Quick Reference → know where to find everything
- Day 3: Read Master Prompt sections 1–3 → understand the full context
- Day 4: Pick 1 bug, fill Task Template, implement (with checklist open)
- Day 5: Code 3 smaller bugs, use Quick Reference exclusively

**Week 2: Mastery**
- Days 6–8: Code 5 bugs/features in a row using Task Template
- Days 9–10: Refactor a file >500 lines → split + apply all rules
- Self-check: Can you code a task in 45 min without asking questions?

**Week 3+: Optimized**
- Use Quick Reference + Memory Pin exclusively (never need Master Prompt for basic tasks)
- Mentoring others? Point them to Memory Pin + Quick Reference
- Refine prompts based on what's missing

---

## 🤝 TEAM ONBOARDING

**For each team member:**

1. Send them this document
2. Send them Memory Pin
3. Send them Quick Reference
4. Have them do 2 tasks with you watching
5. Have them do 2 tasks solo with Quick Reference open
6. They're ready to work independently

**Time to productivity**: 2–3 hours.

---

## 📊 SUCCESS METRICS

**After implementing this system, you should see:**

- ✅ **Token efficiency**: 70–80% fewer tokens per task
- ✅ **Time to delivery**: 45–60 min per task (vs. 2+ hours before)
- ✅ **Zero rule violations**: Checklists prevent mistakes
- ✅ **Consistent code quality**: Everyone follows same rules
- ✅ **New team members**: Productive in 2–3 hours (vs. 2–3 days)
- ✅ **Fewer revisions**: Verification checklist catches issues early

---

## 🎯 YOUR NEXT STEPS

1. **Right now**: Save all 4 documents to your repo
2. **Today**: Read Memory Pin + Quick Reference
3. **This week**: Fix the first 3 bugs using Task Template
4. **Next week**: Roll out to team, use as standard prompt

---

## 📞 QUICK LINKS

- **Master Prompt**: Full reference, all rules, all checklists
- **Quick Reference**: Fast lookup, bug table, quick fixes
- **Memory Pin**: Core rules, mention in every task
- **Task Template**: Planning format, 6 examples included

**Bookmark these. Reference them daily.**

---

**You're ready. Go fix bugs. 🚀**
