<!--
SYNC IMPACT REPORT
==================
Version change: [unversioned template] → 1.0.0
Modified principles: N/A (initial ratification — all sections newly authored)
Added sections:
  - I. MCP Server-Client Architecture
  - II. Quality & Verifiability
  - III. Scope & Maintenance
  - Governance
Removed sections: N/A (was a blank template)
Templates updated:
  ✅ .specify/memory/constitution.md — this file
  ⚠ .specify/templates/plan-template.md — Constitution Check section references generic gates; no structural change needed
  ⚠ .specify/templates/spec-template.md — no structural change needed
  ⚠ .specify/templates/tasks-template.md — test tasks are already marked OPTIONAL; CI gate note should be
                                            added when generating tasks for this project
Deferred TODOs:
  - TODO(RATIFICATION_DATE): Exact original ratification date unknown — set to today (2026-04-30) as first
    formal ratification of this constitution.
-->

# MCP Server NodeJS (Valueray) Constitution

## Core Principles

### I. MCP Server-Client Architecture

The MCP Server is the **sole integration point** with the Valueray API and MUST expose
all stock and ETF data exclusively through the Model Context Protocol (MCP) server-client
pattern. No direct Valueray API calls are permitted in client code.

- The server layer owns all communication with the Valueray API (authentication,
  request construction, response parsing, error propagation).
- Consumers MUST interact only through MCP tool/resource interfaces — never by
  importing server internals directly.
- New data domains (e.g., new asset classes from Valueray) MUST be added as new
  MCP tools or resources, not as ad-hoc REST endpoints or exported helpers.

### II. Quality & Verifiability

Every feature that contains data logic (services, data-access layers, or "smart"
components) MUST include automated tests. The following rules are non-negotiable:

- **Service tests MUST be written before a PR is merged.** Untested services are
  a blocking defect, not a follow-up task.
- **Bug fixes MUST include a regression test** that first fails (reproducing the bug)
  and then passes (verifying the fix). A fix without a regression test will not be
  accepted.
- **CI MUST run all tests in headless mode** and MUST fail the pipeline if any test
  breaks. Skipping or silencing CI failures is not permitted.
- Test scope includes at minimum: unit tests for services and smart components;
  integration tests where MCP tool contracts are involved.

### III. Scope & Maintenance

Documentation and specs are living artifacts that MUST stay synchronized with the
codebase behavior:

- **Behavior change → update spec AND plan** of the corresponding feature.
  A PR that changes observable behavior without updating docs will be rejected.
- **Implementation-only change (no behavior change) → keep spec intact.** The
  plan MAY be updated if internal design decisions changed, but the spec MUST NOT
  be modified.
- **PRs MUST be small and traceable**: each PR addresses one concern, references
  the relevant spec/task, and includes a validation checklist covering at minimum:
  - [ ] Tests pass (headless CI green)
  - [ ] Build succeeds
  - [ ] Server runs and MCP tool responds correctly (smoke test)

## Governance

- This constitution supersedes all other project practices, informal conventions,
  and prior verbal agreements. When conflicts arise, the constitution wins.
- **Amendment procedure**: Any principle change requires (1) a PR updating
  `constitution.md`, (2) a corresponding update to any affected spec/plan, and
  (3) explicit approval by the project maintainer before merging.
- **Versioning policy**: Follow semantic versioning (MAJOR.MINOR.PATCH).
  - MAJOR: Backward-incompatible removal or redefinition of a principle.
  - MINOR: New principle or materially expanded guidance added.
  - PATCH: Clarification, wording fix, or non-semantic refinement.
- **Compliance review**: All PRs and code reviews MUST verify compliance with the
  three core principles above. Non-compliance is a blocking review comment.

**Version**: 1.0.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-04-30
