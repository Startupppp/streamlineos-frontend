# Custom Forms, Objects And Dynamic Fields

## Goal
Make HRMS extensible without code changes.

## Features
- Custom employee fields
- Custom HR forms
- Conditional form fields
- Custom HR objects
- Form templates
- Form submissions
- Approval-linked forms
- Public/internal HR intake forms
- Field validation rules
- Field-level permissions

## Use Cases
- Work from home request
- Travel request
- Uniform request
- Medical claim
- Visa record
- Insurance claim
- Laptop request
- Address change
- Bank detail change
- Emergency contact update
- Grievance intake
- Exit questionnaire

## Backend Requirements
- Schema for custom fields and custom objects.
- Field types: text, number, date, select, multi-select, boolean, file, employee reference, department reference, currency.
- Conditional visibility.
- Required rules.
- Effective dates where relevant.
- Audit all submitted form data.

## Frontend Requirements
- Form builder.
- Form preview.
- Form renderer.
- Submissions list.
- Attach workflow to form.

## Acceptance Criteria
- Admin can create a form without developer help.
- Form submission can start workflow.
- Sensitive custom fields respect permissions.

