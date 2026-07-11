# Fixed Assets, Depreciation And Amortization

## Goal
Track assets and automatically create depreciation journals.

## Backend Requirements
Tables:
- accounting_fixed_assets
- accounting_asset_categories
- accounting_depreciation_schedules
- accounting_depreciation_runs

## Asset Fields
- asset number
- name
- category
- acquisition date
- acquisition cost
- vendor
- bill reference
- useful life
- depreciation method
- salvage value
- accumulated depreciation
- status

## Depreciation Methods
Start with:
- Straight-line

Later:
- Written down value
- Units of production

## Frontend Requirements
Pages:
- Asset list
- Asset detail
- Add asset
- Depreciation run
- Asset disposal

## Acceptance Criteria
- Asset purchase can be linked to vendor bill.
- Depreciation run creates journal entry.
- Disposal creates gain/loss entry.

