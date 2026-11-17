---
status: accepted
date: 2026-11-17
---

# Publish the Windows installer from Nouli releases

## Context

Nouli 0.6.0 adds native Windows ARM64 and x64 release ZIPs. The website needs a
Windows installation path alongside its existing Unix script without maintaining
a second installer implementation.

## Decision

Publish the release's `scripts/install.ps1` as `public/install.ps1` at
`/install.ps1`. Keep the implementation and its executable Cargo tests in
[nouli-ai/nouli](https://github.com/nouli-ai/nouli), following its
[ADR 0030](https://github.com/nouli-ai/nouli/blob/main/docs/adr/0030-distribute-windows-release-archives.md).
Extend the existing release-sync workflow to copy both available installer
scripts. Releases predating the Windows installer preserve its published copy.
The normal pull request checks and automatic release-sync merge still apply.

Keep the Windows command in the shared typed installation data and render it in
the home page and guide without JavaScript. Copy uses the existing keyboard
accessible enhancement. The published URL inventory covers the new endpoint.

## Considered alternatives

- Maintaining the installer here could drift from the assets a Nouli release
  actually publishes.
- Fetching the installer during each site build would make builds depend on a
  live upstream repository and bypass the release-sync review boundary.

## Consequences

The site remains buildable and testable without provider credentials or live
release lookups. Installer behavior is tested on Windows through Cargo in its
owning repository; website checks cover publishing, commands, and interaction.
New instructions require Nouli 0.6.0 assets before the site is deployed.
