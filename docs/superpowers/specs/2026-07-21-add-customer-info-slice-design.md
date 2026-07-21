# Slice 1: Add Customer Info → Auto-complete Customer Info Step

**Date:** 2026-07-21
**Status:** Approved

## Goal

Give CS the first ability to *record work* against the onboarding queue (the app is
currently 100% read-only). CS enters basic customer info; the customer joins the queue
already at 25% with the "Customer Info" step marked complete.

## Scope

**In scope**
- `POST /api/customers` write endpoint.
- Customer Info tab becomes a working form.
- New customer appears in the dashboard queue at 25%.
- One server unit test.

**Out of scope (later slices)**
- Editing / removing customers.
- Marking the other three steps (Data Mapping, Tenant Setup, Import).
- Email format validation.
- Persistence beyond in-memory store.

## Server: `POST /api/customers`

- **Body:** `{ name, industry, region, contactEmail }`
- **Validation:** `name` is required. Missing/blank → `400 { error: "name is required" }`.
  Other fields optional (default to empty string via `createCustomer`).
- **Behavior:**
  1. Create customer via `createCustomer(...)`.
  2. Build a default onboarding state (`createDefaultOnboardingSteps()`).
  3. Set `step_1` (Customer Info) `status` → `completed`.
  4. Recalculate `progressPercent` via `calculateProgress(steps)` → 25%.
  5. Persist with `store.addCustomer` and `store.addOnboardingState`.
- **Response:** `201` with the joined dashboard entry (onboarding state + `customerName`,
  `customerIndustry`, `customerRegion`), matching the shape returned by `GET /api/onboarding`
  so the client can drop it straight into the queue.

## Client: Customer Info tab

- Replace `PlaceholderTab` for `customer-info` with a `CustomerInfoForm`.
- Fields: Name (required), Industry, Region, Contact Email.
- On submit → `POST /api/customers`.
  - Success: prepend returned entry to `onboardingData`, reset form, switch to Dashboard tab.
  - Failure: show inline error message; keep form values.

## Testing

Server unit test (alongside existing `models.test.js` style):
- POST with a valid name → customer created, `step_1.status === 'completed'`,
  `progressPercent === 25`.
- POST with no name → `400`.

## Verification

- New customer appears in the Dashboard queue at 25% with Customer Info step checked.
- `npm run test:unit` passes.
