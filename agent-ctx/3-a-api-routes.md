# Task 3-a: API Routes
**Agent:** full-stack-developer
**Date:** 2025-07-22

## Summary
Created and enhanced all 12 API routes for the Arogya FinScore application. All routes follow consistent patterns: JWT auth via `verifyToken()`, Prisma DB via `import { db } from '@/lib/db'`, try/catch with 500 fallback, JSON responses via `NextResponse.json()`, and pagination with `{ data, total, page, pageSize }`.

## Files Created

1. **`src/app/api/applications/[id]/route.ts`** — GET single application with full related data (beneficiary, scores, decisions+overrides, documents, repayments, consumption data). PUT for status transitions with validation against `VALID_STATUS_TRANSITIONS` map. Auto-sets timestamps (sanctionedAt, disbursedAt, closedAt, decisionAt).

2. **`src/app/api/applications/[id]/score/route.ts`** — POST triggers scoring for an application. Fetches beneficiary + consumption data, generates features via `generateFeaturesFromData()`, runs `scoreApplication()`, stores CreditScore, creates auto-decision, transitions status. Measures inference time.

3. **`src/app/api/applications/[id]/decide/route.ts`** — POST for analyst decisions (approve/reject/override). Creates CreditDecision, optional ManualOverride for grade changes, creates repayment schedule on approval, transitions application status.

4. **`src/app/api/beneficiaries/route.ts`** — GET list with pagination, search (name/aadhaar/pan/phone/email), filter by state/category/partnerId, sortable. POST to create new beneficiary with duplicate Aadhaar check.

5. **`src/app/api/beneficiaries/[id]/route.ts`** — GET 360° beneficiary view: all applications with scores/decisions/repayments, consumption data, documents. Includes computed summary (totalApps, avgScore, totalDisbursed, overduePayments).

6. **`src/app/api/monitoring/route.ts`** — GET model performance metrics, scoring volume/distribution, decision distribution, pipeline status, override statistics, active model versions with aggregated stats.

7. **`src/app/api/fairness/route.ts`** — GET fairness metrics by protected attribute (gender, category, state). Combines stored FairnessMetric records with real-time computation of approval rates, avg scores, and disparate impact ratios.

8. **`src/app/api/reports/route.ts`** — GET comprehensive report data: disbursement trends, monthly application counts, portfolio quality (recovery rate, default rate, collection rate), state-wise loan data, scheme distribution, grade distribution, category-wise analysis.

9. **`src/app/api/partner/route.ts`** — GET partner-specific data (referrals, status distribution, financial summary) or list all partners with computed stats. POST for single/bulk beneficiary referral upload with duplicate detection.

10. **`src/app/api/admin/feature-flags/route.ts`** — GET all feature flags as array + key-value map. PUT supports bulk and single flag updates via upsert.

## Files Enhanced

11. **`src/app/api/route.ts`** — Replaced hello-world with API info endpoint returning endpoint map + live DB stats.

12. **`src/app/api/audit/route.ts`** — Added: date range filtering (startDate/endDate), resource filtering, search across action/resource/details/user, sortable, role-based access (admin/analyst/auditor only), action type suggestions for filters.

13. **`src/app/api/admin/users/route.ts`** — Added: GET pagination (page/pageSize), search, role filter, active filter, sorting. Added full PUT for user updates (email/name/role/phone/avatar/isActive/password). Added DELETE for soft-deactivation with session cleanup and self-deletion prevention. Audit logging on all mutations.

## Patterns Used
- Auth: `verifyToken()` from `@/lib/auth` with Bearer token extraction
- Permission: `hasPermission()` from `@/lib/auth`
- DB: `import { db } from '@/lib/db'` (Prisma)
- Pagination: `{ data, total, page, pageSize, totalPages }`
- Error handling: try/catch → 500, specific 400/401/403/404/409 responses
- Audit: `db.auditLog.create()` on all mutating operations

## Lint
- Passes `bun run lint` with zero errors.
