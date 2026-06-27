# StreamlineOS RBAC Product Bible

# 06 -- Frontend Architecture

## Purpose

Define the frontend architecture for the RBAC module using Next.js App
Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand and
Drizzle-compatible APIs.

------------------------------------------------------------------------

# Core Principles

-   Server Components by default.
-   Client Components only for interactivity.
-   No business logic inside UI components.
-   Centralized API hooks.
-   Reusable components before new components.
-   Strong typing everywhere.
-   Accessibility by default.

------------------------------------------------------------------------

# Folder Structure

``` text
app/
  settings/
    roles/
    permissions/

components/
  rbac/
    roles/
    permissions/
    simulator/
    shared/

hooks/
  rbac/

lib/
  api/
  services/
  permissions/

stores/
  rbac/

types/
  rbac/
```

------------------------------------------------------------------------

# Component Architecture

## Pages

-   Roles List
-   Role Details
-   Permission Matrix
-   User Assignment
-   Simulator
-   Audit

## Shared Components

-   RoleTable
-   RoleCard
-   PermissionTree
-   PermissionBadge
-   PermissionChip
-   ScopeSelector
-   AssignmentPanel
-   SimulatorResult
-   AuditTimeline

------------------------------------------------------------------------

# State Management

## TanStack Query

Use for:

-   Server data
-   Pagination
-   Search
-   Filters
-   Mutations

## Zustand

Use for:

-   UI preferences
-   Selected role
-   Active filters
-   Drawer state
-   Simulator state

Never duplicate server state.

------------------------------------------------------------------------

# Query Keys

-   roles
-   role
-   permissions
-   assignments
-   simulator
-   audit

Invalidate after every successful mutation.

------------------------------------------------------------------------

# Forms

Use:

-   react-hook-form
-   Zod

Validation:

-   Inline
-   Blur
-   Submit

Large forms → Sheet

Small forms → Dialog

------------------------------------------------------------------------

# Navigation

Sidebar generated from:

-   Subscription
-   Feature Flags
-   Effective Permissions

Never hardcode menu visibility.

------------------------------------------------------------------------

# Error Handling

Each page provides:

-   Skeleton
-   Empty State
-   Error State
-   Permission Denied State

------------------------------------------------------------------------

# Performance

-   Dynamic imports
-   Lazy loading
-   Virtualized tables
-   Debounced search
-   Optimistic updates where safe

------------------------------------------------------------------------

# Accessibility

-   Keyboard navigation
-   Focus management
-   ARIA attributes
-   WCAG AA
-   Screen reader support

------------------------------------------------------------------------

# Responsive Design

Desktop: - Full tables

Tablet: - Reduced columns

Mobile: - Cards + drawers

------------------------------------------------------------------------

# Acceptance Criteria

-   Reusable architecture
-   Minimal re-renders
-   Strong typing
-   Accessible
-   Permission-aware
-   Consistent with StreamlineOS design system
