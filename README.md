# Healthcare+

Healthcare+ is a frontend-only Sprint 1 prototype for appointment capacity and queue management. It uses HTML5, CSS3, vanilla JavaScript, and fictional browser-side sample data.

## Run

Open `frontend/index.html` with VS Code Live Server, or open it directly in a browser. No install or build step is required.

## Publish on GitHub Pages

The `main` branch automatically deploys the static site from `frontend/` using
`.github/workflows/deploy-pages.yml`. To enable it for the repository, open
**Settings → Pages**, set **Source** to **GitHub Actions**, and push to `main`
or run the workflow manually from the **Actions** tab.

The published site is available at:
`https://vinod-hn.github.io/Anudip---Healthcare-appointment-capacity-and-queue-Management-platform/`

## Structure

- `frontend/pages/patient/`: the four patient screens
- `frontend/pages/admin/`: the three admin screens
- `frontend/pages/reception/`: schedule, check-in, and queue screens
- `frontend/css/`: shared and role-specific styles
- `frontend/js/`: mock data, shared state, utilities, and role scripts
- `docs/`: requirements, UI rules, and sprint ownership

## Shared conventions

`window.HealthcareState.data` is the single in-browser state object. Use the existing doctor, slot, appointment, and status field names in `frontend/js/mock-data.js`. Appointment statuses are `confirmed`, `checked_in`, `waiting`, `called`, `in_consultation`, `completed`, `cancelled`, and `skipped`.

This is a demo, not a production hospital system. It contains no backend, database, authentication, security, compliance, or real patient information.

## Vinod admin work

Vinod's implementation is on the `feature/admin-ui` branch and covers:

- Dashboard KPI cards, appointment status summary, and department capacity derived from shared state.
- Appointment search by patient or ID, date/status filters, details dialog, cancellation, and rescheduling.
- Doctor search, add/edit form, and active/inactive status changes.
- `localStorage` persistence so the demo workflow can move between pages in the same browser.

See [`docs/vinod-work.md`](docs/vinod-work.md) for the step-by-step implementation record and validation checklist.
