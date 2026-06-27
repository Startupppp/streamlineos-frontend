# StreamlineOS RBAC Product Bible

# 03 -- Database Design

## Purpose

Define the database architecture for the RBAC platform. The schema must
support multi-tenancy, modular licensing, future ABAC, enterprise
scalability, and backward-compatible evolution.

------------------------------------------------------------------------

# Design Principles

-   Multi-tenant first
-   UUID primary keys
-   Soft delete
-   Audit every mutation
-   No duplicated permission data
-   Explicit foreign keys
-   Optimized indexes
-   Drizzle ORM compatible

------------------------------------------------------------------------

# Core Tables

## organizations

Stores tenant information.

Key Fields

-   id
-   name
-   slug
-   subscription_id
-   timezone
-   status
-   created_at
-   updated_at

Indexes

-   slug UNIQUE
-   status

------------------------------------------------------------------------

## users

Stores organization members.

Fields

-   id
-   organization_id
-   email
-   first_name
-   last_name
-   avatar_url
-   status
-   created_at
-   updated_at

Indexes

-   organization_id
-   email UNIQUE

------------------------------------------------------------------------

## roles

Fields

-   id
-   organization_id
-   name
-   description
-   type (system/custom/temporary)
-   scope
-   is_system
-   is_active
-   expires_at
-   created_by
-   updated_by

Indexes

-   organization_id
-   name UNIQUE per organization
-   type

------------------------------------------------------------------------

## permissions

Fields

-   id
-   module
-   resource
-   action
-   scope
-   display_name
-   description

Example

inventory.products.view.organization

------------------------------------------------------------------------

## role_permissions

Maps many-to-many.

Fields

-   role_id
-   permission_id

Composite Unique

(role_id, permission_id)

------------------------------------------------------------------------

## user_roles

Fields

-   user_id
-   role_id
-   assigned_by
-   expires_at

Supports temporary assignments.

------------------------------------------------------------------------

## user_permissions

Direct overrides.

Never preferred over roles except for exceptions.

------------------------------------------------------------------------

## modules

Tracks installed modules.

Fields

-   key
-   name
-   version
-   enabled
-   license_required

------------------------------------------------------------------------

## feature_flags

Fields

-   key
-   enabled
-   rollout_percentage

------------------------------------------------------------------------

## audit_logs

Tracks every security-sensitive action.

Fields

-   actor_id
-   organization_id
-   resource
-   action
-   before
-   after
-   ip
-   user_agent
-   timestamp

------------------------------------------------------------------------

# Relationships

Organization ├── Users ├── Roles ├── Modules ├── Audit Logs

Users ├── User Roles └── User Permissions

Roles └── Role Permissions

Permissions └── Role Permissions

------------------------------------------------------------------------

# Multi-Tenancy Rules

-   Every business table contains organization_id.
-   Queries are always organization scoped.
-   Cross-tenant joins are prohibited.
-   Platform admins use dedicated platform context.

------------------------------------------------------------------------

# Soft Delete

Use deleted_at and deleted_by.

Never hard delete system roles.

------------------------------------------------------------------------

# Index Strategy

Index:

-   organization_id
-   role_id
-   permission_id
-   user_id
-   module
-   action
-   scope

Composite indexes for common permission lookups.

------------------------------------------------------------------------

# Migration Rules

-   Forward-only migrations.
-   Never rename columns without migration path.
-   Backfill data before removing legacy structures.
-   Validate every migration in staging.

------------------------------------------------------------------------

# Future Ready

Schema must support:

-   ABAC
-   Policy engine
-   External identities
-   Marketplace modules
-   Workspaces
-   Cross-company consultants
-   AI agents

------------------------------------------------------------------------

# Acceptance Criteria

-   Normalized schema
-   Optimized joins
-   Drizzle compatible
-   Migration friendly
-   Multi-tenant secure
-   Enterprise extensible
