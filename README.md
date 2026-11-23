# LabLink

LabLink is a no-login campus prototype for discovering shared laboratory equipment, attaching requests to student projects, and reviewing requests with an explainable fairness score.

## Run locally

Requires Node.js 22.5 or newer (uses the built-in `node:sqlite` module).

```sh
npm start
```

Open `http://localhost:3000`. The database is created and seeded at `data/lablink.sqlite` on first run. Select a student, faculty reviewer, or campus administrator from the workspace switcher to explore the different workflows. Set `OPENAI_API_KEY` to enable LLM extraction for project searches; without it, the built-in local requirement matcher is used.

## Included workflows

- Search and filter a cross-department equipment catalog, or describe a project in natural language to rank relevant resources.
- Create projects, request equipment for a time slot, see a fairness explanation, and receive compatible alternatives.
- Enforce equipment capacity, individual schedule conflicts, booking duration, and recorded safety training.
- Review pending requests as faculty or an administrator; decisions are recorded in an audit log.
- View campus demand and recent activity as an administrator.

## Structure and prototype scope

- `public/`: responsive, framework-free frontend with reusable rendering and form helpers.
- `server/index.js`: Node HTTP server and validated REST endpoints.
- `server/db.js`: relational SQLite schema, indexes, and repeatable first-run seed data.
- `server/scheduler.js`: transparent deadline, prior-access, and department-demand scoring plus alternatives.
- `server/ai.js`: optional OpenAI-compatible requirement extraction with a local fallback.

This is a runnable prototype. Allocation is deterministic and does not use LLM output. Set `LABLINK_FAIRNESS_POLICY` to a JSON object to configure `urgency`, `deadline`, `access_balance`, `department_balance`, `specification_fit`, `repeat_penalty`, `history_days`, and `usage_limit`. Allocation recommendations account for equipment capacity and eligibility constraints, then rank eligible requests by normalized policy weights with booking ID as a stable tie-breaker. Faculty retains final approval. OR-Tools is not used because the current prototype ranks requests for a single equipment and time window; a multi-resource, multi-slot campus solver would be a more appropriate point to introduce it.
