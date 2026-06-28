# StreamlineOS Product Bible

# Customer Onboarding Platform

# 16_Backend_APIs.md

## Core APIs
POST /api/onboarding/start
GET /api/onboarding/status
PATCH /api/onboarding/profile
POST /api/onboarding/generate-workspace
POST /api/onboarding/install-apps
POST /api/onboarding/import
POST /api/onboarding/invite
POST /api/onboarding/complete

## Requirements
- Auth required
- Tenant isolated
- Zod validation
- Audit logging
- Event publishing

## Acceptance Criteria
Reliable, resumable onboarding APIs.
