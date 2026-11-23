# LabLink · Campus Laboratory Resource Exchange

LabLink helps students find and reserve shared campus laboratory equipment for academic projects. It matches project needs to equipment across departments, checks booking and safety constraints, and gives faculty a clear basis for reviewing competing requests.

This is a runnable prototype built around a practical campus problem: useful equipment can sit idle in one department while another department's students cannot find or access it.

## Selected vertical and problem

**Vertical:** Higher education laboratory operations and cross-department resource sharing.

Students often need specialized equipment owned by another department. Separate catalogs, manual approvals, conflicting bookings, unclear safety requirements, and opaque allocation decisions make access slow and uneven. LabLink gives students one project-aware catalog and gives campus staff a traceable workflow for reviewing requests, managing equipment, and sharing limited capacity.

## Technical approach

- **Project matching:** Local keyword, synonym, and specification extraction works without network access. When configured, Gemini or an OpenAI-compatible provider can extract structured project requirements. Provider output is validated; matching and authorization remain server-side.
- **Compatibility and alternatives:** Equipment capabilities, technical specifications, operating status, capacity, training, and supervision requirements are checked deterministically. The app can suggest equivalent items and available slots.
- **Execution planning:** The planner creates ordered activities with dependencies, checks compatible equipment and safety eligibility, and proposes slots before the project deadline. Plans are suggestions; submitting bookings and staff approval are separate actions.
- **Conflict resolution:** Eligible competing requests receive reproducible scores based on deadline urgency, recent access, department balance, specification fit, and repeat usage. The review view exposes the reasons and leaves the final decision to staff.
- **Booking integrity:** SQLite foreign keys and indexes support the relational workflow. Capacity-changing operations use transactions so simultaneous requests cannot confirm beyond the available units.

## Core workflows

- Search equipment across departments and inspect availability, specifications, safety requirements, and compatibility.
- Create a project, plan dependent lab activities, compare alternatives, and request a time slot.
- Review allocation reasons and proposed alternatives; faculty can approve or reject requests with a note.
- Join a waitlist, receive an exclusive slot offer, and accept it for faculty review.
- Record equipment collection and return with QR workflows; log usage, training verification, damage reports, maintenance, and in-app notifications.
- View role-specific student, faculty, technician, and administrator screens, including utilization insights and unverified no-show candidates.

## Technology stack

- Node.js 22.5 or newer, using the native HTTP server and built-in `node:sqlite` database.
- Browser UI built with semantic HTML, native JavaScript modules, and CSS. There are no third-party runtime dependencies or build step.
- Optional Gemini or OpenAI-compatible API for structured extraction and grounded assistant answers. Deterministic local behavior remains available without a provider key.
- Supabase migrations and a read-only equipment catalog API are included separately; the booking and role workflows still use SQLite.

## Review criteria

| Criterion | What the project demonstrates |
|---|---|
| Problem statement alignment | Cross-department equipment discovery, project-aware matching, booking, safety prerequisites, and utilization insights address fragmented campus lab access. |
| Code quality | Database access, scheduling, planning, AI integration, QR workflows, security, and uploads have separate server modules. The REST routes are handled by one controller; the browser UI uses native ES modules. |
| Security | Request identity is bound to a signed HTTP-only demo session; SQLite values use parameters; request-size and rate limits, security headers, and static-file path checks are included. Demo roles are public and are not real authorization. |
| Efficiency | Runs on native Node.js and SQLite with no third-party runtime dependencies. Local matching works without an AI key; an external model is optional. |
| Testing | Node's built-in test runner covers REST workflows, booking conflicts, eligibility, authorization, security headers, and upload validation. |
| Accessibility | Semantic page landmarks, a skip link, labeled controls, keyboard-visible focus, and live status announcements are included. |

## Try the main workflow

1. Start as a student and search for equipment using a project need, or draft a project schedule with the planner.
2. Review matches, availability, safety requirements, and suggested alternatives, then submit a booking request.
3. Switch to a faculty demo profile to review the request and its allocation reasons, then approve or reject it with a note.
4. Switch to a technician to record equipment condition or maintenance, or to an administrator to view utilization insights.

Use the profile selector in the top-right corner to switch among seeded demo personas. This is a demo convenience, not a real login system.

## Run locally

Requirements: Node.js 22.5 or newer. No dependency installation is required.

```sh
git clone https://github.com/sureshsavant576-create/Dark_LOrd.git
cd Dark_LOrd
npm start
```

Open http://localhost:3000. The app creates and seeds its local SQLite database on first run.

Run the automated test suite with:

```sh
npm test
```

Optional AI-backed extraction can be configured with a provider key. Without one, the local deterministic matcher remains available.

## Project structure

- server/index.js — HTTP server and REST API
- server/db.js — SQLite schema, seed data, and queries
- server/scheduler.js — booking eligibility, fairness scoring, and allocation
- server/planner.js — project task and schedule planning
- server/security.js — demo sessions, request identity, rate limits, and headers
- public/ — browser UI, styles, and client-side behavior
- tests/ — integration, security, and upload validation tests
- supabase/ — separate schema, seed data, and read-only public catalog API

## Assumptions and limitations

The persona selector is intentionally available in the demo, so it does not authenticate campus members or provide production authorization. Do not use real student or institutional data. Configure a stable `LABLINK_SESSION_SECRET` of at least 32 bytes when keeping demo sessions across server restarts. AI features require a server-side provider key; local matching remains available without one. Without a provider key, the planner uses a labeled generic three-task template that students should review. The app's booking workflows use local SQLite; the included Supabase schema is a separate integration and does not back those workflows. Cloud Run's local filesystem is temporary, so a hosted demonstration can lose its SQLite data when an instance stops.
