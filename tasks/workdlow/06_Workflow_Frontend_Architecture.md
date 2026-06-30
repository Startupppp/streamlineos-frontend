# StreamlineOS Product Bible

# Workflow & Automation Platform

# 06_Workflow_Frontend_Architecture.md

## Purpose

Define the frontend architecture, component hierarchy, state management, real-time updates, and UX standards for the Workflow & Automation Platform.

---

# Technology Stack

- Next.js App Router
- React
- TypeScript (Strict)
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand (UI State Only)
- React Hook Form
- Zod
- React Flow
- WebSockets / SSE

---

# Folder Structure

app/
  (dashboard)/
    workflows/
    workflow-templates/
    approvals/
    executions/

components/
  workflow/
    builder/
    canvas/
    nodes/
    approvals/
    executions/
    analytics/
    shared/

hooks/
  workflow/

lib/
  api/workflow/
  services/workflow/

stores/
  workflow/

types/
  workflow/

---

# Core Pages

- Workflow Dashboard
- Workflow Builder
- Workflow Details
- Workflow Templates
- Approval Center
- Execution Monitor
- Execution History
- Scheduler
- Analytics

---

# Core Components

- WorkflowCanvas
- NodePalette
- WorkflowNode
- EdgeEditor
- TriggerSelector
- ActionSelector
- ConditionBuilder
- ApprovalCard
- ExecutionTimeline
- VariableEditor
- SecretSelector

---

# State Management

TanStack Query

- Workflows
- Templates
- Executions
- Approvals
- Analytics

Zustand

- Canvas state
- Selected node
- Zoom level
- Drawer state
- Unsaved changes

---

# Real-Time Features

Support:

- Live execution updates
- Approval status changes
- Collaboration presence (future)
- Execution logs
- Background synchronization

---

# UX States

Every page includes:

- Loading skeleton
- Empty state
- Error state
- Permission denied
- Success toast
- Unsaved changes warning

---

# Performance

- Lazy load node editors
- Virtualized execution logs
- Code splitting
- Memoized nodes
- Optimistic updates
- Query caching

---

# Accessibility

- WCAG AA
- Keyboard shortcuts
- Screen reader support
- Focus management
- High contrast mode

---

# Acceptance Criteria

- Responsive
- Accessible
- Reusable components
- Real-time updates
- Production ready
