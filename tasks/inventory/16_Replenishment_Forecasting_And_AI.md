# StreamlineOS Product Bible

# Inventory Management Module

# 16_Replenishment_Forecasting_And_AI.md

## Purpose

Replenishment and AI help teams avoid stockouts, reduce dead stock, and improve purchasing decisions.

## Reorder Rules

Fields:

- Product/variant.
- Warehouse.
- Minimum quantity.
- Maximum quantity.
- Reorder quantity.
- Vendor.
- Lead time.
- Safety stock.
- Active status.

Rule output:

- Suggested quantity.
- Suggested vendor.
- Expected date.
- Reason.

## Replenishment Logic

Forecasted stock:

- `on_hand + incoming - outgoing`.

Trigger:

- If forecasted stock below min, suggest order up to max or reorder quantity.

## Demand Forecasting

Inputs:

- Sales history.
- Seasonality.
- Lead time.
- Stockouts.
- Promotions post-MVP.

Outputs:

- Demand forecast.
- Stockout risk.
- Overstock risk.
- Suggested reorder.

## AI Assistant

Questions:

- Why is this product out of stock?
- What should I reorder this week?
- Which vendors are delayed?
- Which stock is slow-moving?
- Which products are at expiry risk?
- Explain inventory valuation change.

Rules:

- AI respects RBAC and warehouse data scope.
- AI uses only permitted inventory data.
- AI cites source records.
- AI usage follows billing/top-up rules.

## AI Insights

Generate:

- Stockout risk.
- Overstock risk.
- Dead stock.
- Vendor delay.
- Reorder anomalies.
- Negative stock anomaly.
- Unusual adjustment activity.

## Acceptance Criteria

- Reorder report is deterministic.
- AI never exposes warehouses/products outside user scope.
- AI insights cite source data.
- Forecasting can be disabled per organization.
