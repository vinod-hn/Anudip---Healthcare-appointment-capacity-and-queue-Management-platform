# Healthcare+

Healthcare+ is a frontend-only Sprint 1 prototype for appointment capacity and queue management. It uses HTML5, CSS3, vanilla JavaScript, and fictional browser-side sample data.

## Run

Open `frontend/index.html` with VS Code Live Server, or open it directly in a browser. No install or build step is required.

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
