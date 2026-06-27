# StreamlineOS RBAC Product Bible

# 10 -- Subscription Integration

## Purpose

The subscription system determines which modules, features, limits and
AI capabilities are available before RBAC permissions are evaluated.

------------------------------------------------------------------------

# Objectives

-   Modular pricing
-   Per-user licensing
-   AI credit top-ups
-   Plan upgrades/downgrades
-   Feature gating without deployments

------------------------------------------------------------------------

# Evaluation Order

1.  Organization active
2.  Subscription active
3.  Plan valid
4.  Module purchased
5.  Feature enabled
6.  Seat available
7.  AI credits available (if required)
8.  RBAC permission evaluation

------------------------------------------------------------------------

# Pricing Model

Supports:

-   Per module
-   Per active user
-   Bundle plans
-   Enterprise custom plans
-   AI credit packs
-   Usage-based add-ons

------------------------------------------------------------------------

# Core Entities

## Subscription

-   id
-   organization_id
-   plan
-   status
-   renewal_date
-   billing_provider

## Module License

-   module_key
-   enabled
-   seat_limit
-   expires_at

## AI Credits

-   balance
-   consumed
-   topups
-   monthly_quota

------------------------------------------------------------------------

# Module Gating

Unavailable modules must:

-   Be hidden from sidebar
-   Be excluded from search
-   Hide dashboards
-   Block APIs
-   Disable automations
-   Hide reports

------------------------------------------------------------------------

# Seat Management

Track:

-   Purchased seats
-   Assigned seats
-   Available seats
-   Pending invitations

Prevent assignment beyond licensed limits.

------------------------------------------------------------------------

# Upgrade Flow

Organization upgrades:

-   Subscription updated
-   Modules enabled
-   Cache invalidated
-   Sidebar regenerated
-   Audit created
-   Notification sent

------------------------------------------------------------------------

# Downgrade Flow

-   Grace period
-   Warn administrators
-   Export opportunity
-   Disable premium features
-   Preserve historical data
-   Never silently delete customer data

------------------------------------------------------------------------

# API Requirements

-   Validate active subscription
-   Validate module entitlement
-   Validate seat assignment
-   Validate AI quota

------------------------------------------------------------------------

# Acceptance Criteria

-   Licensing enforced server-side
-   RBAC integrates with licensing
-   Dynamic navigation
-   Accurate seat accounting
-   Auditable plan changes
