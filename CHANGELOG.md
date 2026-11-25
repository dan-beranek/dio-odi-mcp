# Changelog

## Unreleased

- Synchronize the bundled live SCF status metadata with the published feed: v0.1.14 / schema v0.2.1 / 63 events through 2026-11-25, while preserving the immutable v0.9.0 archive snapshot metadata.
- Keep the published MCP service version unchanged; this is a live-reference metadata update, not a new software release.
- Make remote smoke tests compare MCP live-feed metadata with the current public SCF registry, while checking the historical archive snapshot separately.

## 0.1.1 — 2026-11-11

- Metadata-only archival follow-up to the initial public v0.1.0 release; no functional changes to the MCP service.
- Zenodo version DOI: https://doi.org/10.5281/zenodo.24123229
- Zenodo Concept DOI (all versions): https://doi.org/10.5281/zenodo.24123228


## 0.1.0 — 2026-11-10

- Initial read-only MCP MVP scaffold for Cloudflare Workers.
- Main `get_mutation_guardrail_profile` tool for Agentic ER integration.
- Four diagnostic domains and eight Reconstruction Failure Modes.
- Evidence-promotion and two-phase commit-boundary contracts.
- Canonical concept search/lookup, relation lookup, mapping extracts, and reference status.
- Resources and `plan_mutation_guardrail_integration` prompt.
- Origin allow-list, bounded inputs, and approximate Cloudflare rate limiting.
- Explicit non-implementation boundary for the MVDIO Supervisor and future dependency-aware evidence flow.
