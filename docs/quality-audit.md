# Frontend quality audit

## Scope

This audit covers all 11 HTML pages, shared JavaScript, admin, patient, reception, responsive CSS, navigation, browser state, and the complete demo workflow. The project remains a frontend-only prototype with fictional data, browser-local persistence, and no backend.

## Baseline findings

- The repository has no package manifest, build tool, lint configuration, or automated test framework.
- JavaScript syntax and local HTML references were clean before the audit.
- Admin capacity used a removed `slot.booked` property and displayed `NaN`.
- Confirmed appointments received queue tokens during state initialization instead of at reception check-in.
- Patient availability only used seed slots from a past date, so a fresh install could not book a future appointment.
- Admin rescheduling bypassed schedule, date, capacity, blocked-slot, and duplicate-booking rules.
- Calendar validation accepted normalized invalid dates such as February 31.
- Several accessibility improvements were needed for contrast, focus visibility, dialogs, tables, skip navigation, and dynamic content.

## Changes implemented

- Capacity is now calculated through `HealthcareState.slotInfo()` and exposes a semantic progress bar.
- Tokens stay `null` while an appointment is confirmed and are assigned only by `checkIn()`.
- Patient home and doctor details generate future demo availability and exclude past slots.
- Booking pages ensure the selected future slot exists before rendering the form.
- Added validated `rescheduleAppointment()` business logic and connected the admin reschedule action to it.
- Date validation now round-trips year, month, and day to reject impossible dates.
- Added darker accessible teal/success colors and a high-contrast focus outline.
- Added skip-to-content navigation on every page.
- Added dialog accessible names, table column scopes, progress semantics, live queue updates, check-in detail focus, and walk-in form label associations.
- Added accessible action names for doctor status controls.

## Executed validation

- `node --check` passed for all 7 JavaScript files.
- HTML/local-reference validation passed for all 11 HTML pages.
- `git diff --check` passed.
- Browser dashboard regression passed: capacity displayed numeric values (`3 / 30`, `0 / 1`) instead of `NaN`.
- Browser patient regression passed: future availability rendered for 29 October 2026 and later.
- Browser booking regression passed: empty form validation appeared, valid booking created `APT1004`, and confirmation displayed.
- Browser state regression passed: confirmed appointments persisted with `token: null`.
- Browser check-in regression passed: one token (`T001`) was assigned and status changed to `waiting`.
- Browser focus regression passed: check-in details received focus after selecting View.
- Browser reschedule regression passed for a valid future slot and rejected an invalid calendar date.
- Browser snapshots confirmed skip navigation, progressbar semantics, labelled dialogs, table scopes, and labelled walk-in controls.
- Mobile viewport validation was previously completed at 390px; no new layout-breaking changes were made.

## Remaining limitations

- There is no backend, authentication, database, server-side validation, real-time synchronization, or production persistence.
- There is no committed unit/E2E test runner because this is intentionally a no-build vanilla prototype. Browser checks above were executed manually through the local server.
- LocalStorage is browser-profile-specific and must not be treated as shared or clinical data.
- The project is suitable for a frontend demonstration/staging review, not production clinical use.
