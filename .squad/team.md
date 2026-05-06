# Squad Team

> Partake - [one-line description]

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. Does not generate domain artifacts. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Lead | Lead / Architect | `.squad/agents/lead/charter.md` | 🏗️ Active |
| Frontend | Frontend Dev | `.squad/agents/frontend/charter.md` | ⚛️ Active |
| Backend | Backend Dev | `.squad/agents/backend/charter.md` | 🔧 Active |
| Tester | Tester | `.squad/agents/tester/charter.md` | 🧪 Active |
| Designer | Product Designer | `.squad/agents/designer/charter.md` | 🎨 Active |
| Scribe | Session Logger | `.squad/agents/scribe/charter.md` | 📋 Silent |

## Coding Agent

<!-- copilot-auto-assign: false -->

| Name | Role | Charter | Status |
|------|------|---------|--------|
| @copilot | Coding Agent | — | 🤖 Coding Agent |

### Capabilities

**🟢 Good fit — auto-route when enabled:**
- Bug fixes with clear reproduction steps
- Test coverage (adding missing tests, fixing flaky tests)
- Lint/format fixes and code style cleanup
- Dependency updates and version bumps
- Small isolated features with clear specs
- Boilerplate/scaffolding generation
- Documentation fixes and README updates

**🟡 Needs review — route to @copilot but flag for squad member PR review:**
- Medium features with clear specs and acceptance criteria
- Refactoring with existing test coverage
- API endpoint additions following established patterns
- Migration scripts with well-defined schemas

**🔴 Not suitable — route to squad member instead:**
- Architecture decisions and system design
- Multi-system integration requiring coordination
- Ambiguous requirements needing clarification
- Security-critical changes (auth, encryption, access control)
- Performance-critical paths requiring benchmarking
- Changes requiring cross-team discussion

## Project Context

- **Owner:** Shari Paltrowitz
- **Stack:** [CUSTOMIZE: TBD — early stage project]
- **Description:** Receipt-splitting app: scan a receipt, everyone claims what they ordered, sends Venmo requests. No app to download.
- **Created:** 2026-05-03

## Setup Checklist

When bringing this squad into a new project:

1. Copy this directory into your project as `.squad/`
2. Update Project Context above with your stack and description
3. Optionally copy `optional/domain-expert/` into `agents/` and customize for your domain
4. Optionally copy `optional/optimizer/` into `agents/` if needed
5. Rename agents to match your chosen pop-culture theme (optional)
