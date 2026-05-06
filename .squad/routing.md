# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture, scope, tech decisions, feature scoping, prioritization, MVP | Lead | System design, API contracts, stack choices, code review, user stories, scope challenges |
| React, UI components, styling, PWA | Frontend | Components, pages, Tailwind, accessibility, animations |
| APIs, database, auth, integrations | Backend | Express routes, migrations, Supabase, Firebase, external APIs |
| Tests, quality, edge cases, coverage | Tester | Unit tests, integration tests, regression, product-principle tests |
| UX/UI design, visual hierarchy, copy | Designer | Flows, layouts, design tokens, UX writing, accessibility audit |
| Session logging, decisions | Scribe | Automatic — never needs routing |

> **Note:** If your project has an Optimizer or Domain Expert, add them to this table. See `optional/` for charter templates.

## Keyword Routing

| Keywords | Route To |
|----------|----------|
| "architecture", "design decision", "scope", "API contract", "priority", "roadmap", "MVP", "scope", "user story", "feature request" | Lead |
| "component", "page", "styling", "tailwind", "responsive", "mobile", "accessibility", "PWA" | Frontend |
| "API", "endpoint", "database", "migration", "auth", "firebase", "supabase", "sync" | Backend |
| "test", "bug", "edge case", "coverage", "regression", "quality" | Tester |
| "design", "UX", "UI", "flow", "layout", "animation", "copy", "label" | Designer |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |
| `squad:copilot` | Well-defined issue routed to @copilot | @copilot |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Multi-Domain Routing

| Signal | Action |
|--------|--------|
| "Team, ..." or broad feature request | Fan-out: Lead + relevant domain agents in parallel |
| New feature implementation | Lead (arch + scope) + Frontend/Backend (impl) + Tester (tests) |
| UI/UX feature | Designer (design) + Frontend (impl) |
| Product decision | Lead (scope + tech feasibility) |

## Review Gates

| Change Type | Required Reviewer |
|-------------|-------------------|
| Architecture decisions | Lead must approve before implementation |
| API contracts | Lead must approve before frontend integration |
| New components/pages | Tester must review for test coverage |
| Database migrations | Lead + Backend must both approve |
| Security-related changes | Lead reviews with security focus |

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member.
8. **@copilot routing** — well-defined issues with clear specs may be routed to @copilot. Lead triages and assigns the `squad:copilot` label. See team.md Coding Agent capabilities for routing guidance (🟢/🟡/🔴).
