---
status: accepted
date: 2026-11-17
---

# Deploy the site artifact that passed validation

## Context

CI builds and tests dist, while Pages independently rebuilds and deploys before
main validation finishes. Browser installation also dominates setup time.

## Decision

Split the existing npm check into static checks and browser checks, retaining
npm run check as the complete local entry point. CI builds dist once, validates
it with the existing output checks, then passes that same artifact to browser
and accessibility tests. A version-matched official Playwright image supplies
the browser and system dependencies; Node 24 remains explicit.

Deploy that artifact on main only after workflow, static, and browser checks
succeed. Keep deployment serialized. This replaces ADR 0001's exact single
CI command with the same checks in distinct steps and removes the independent
Pages rebuild. Unix installer behavior is tested in the owning Nouli repository
through Cargo; the website retains its published URLs and release synchronization.

## Considered alternatives

Keeping the Pages rebuild deploys output distinct from the tested artifact.
Caching browser downloads leaves operating-system package installation in place.
A UI framework would add a runtime for a small native control.

## Consequences

A failed check prevents publication. The Playwright image version must match
the locked Playwright package. Local full validation remains npm run check.
