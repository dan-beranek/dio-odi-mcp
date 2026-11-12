# DIO/ODI MCP

A public, read-only Model Context Protocol server for the DIO/ODI Reference Model and its derived Agentic Entity Resolution commit-boundary mappings.

**Primary use case:** an Agentic ER application asks for a mutation-specific DIO/ODI diagnostic profile, retrieves the relevant illustrative constraint mappings, and uses them as inputs to its own domain policy and local Supervisor implementation.

- MCP endpoint: `https://mcp.danielberanek.cz/mcp`
- Human-readable service root: `https://mcp.danielberanek.cz/`
- Health: `https://mcp.danielberanek.cz/healthz`
- LLM-readable overview: `https://mcp.danielberanek.cz/llms.txt`
- Sitemap: `https://mcp.danielberanek.cz/sitemap.xml`
- Crawler rules: `https://mcp.danielberanek.cz/robots.txt`
- Canonical Reference Model: <https://vocab.danielberanek.cz/>
- Source paper: <https://arxiv.org/abs/2610.37407v2>
- Agentic ER architecture mapping: <https://vocab.danielberanek.cz/mappings/agentic-er-architecture/>

## What it does

The main tool, `get_mutation_guardrail_profile`, returns a bounded profile for an action class (`READ`, `STAGE_LOCAL`, `REVERSIBLE_WRITE`, `IRREVERSIBLE_WRITE`) and mutation type (`MERGE`, `SPLIT`, `UNMERGE`, `OTHER`). A typical call for a protected corporate-entity merge supplies the action/mutation class, entity class, observation domain, temporal scope, and current domain-policy version. It returns:

- the four non-exclusive diagnostic domains and selected failure modes;
- the paper's domain-level diagnostic-to-constraint examples, explicitly marked `illustrative`;
- evidence admission and claim-specific promotion requirements;
- Phase 1 and Phase 2 interface checks for protected identity-changing mutations;
- caller context fields that were not supplied (without assuming every field is mandatory for every operation) and source/version provenance.

`Entity Omission` remains part of the full eight-mode taxonomy, but is not included by default in a mutation-boundary profile: its defining condition concerns a reconstruction-stage omission despite sufficient available representational grounds, not simply a missing retrieval result.

The MVP also exposes tools for canonical concept search and lookup, direct SKOS relations, application mapping sections, the evidence-promotion contract, the commit-boundary contract, Policy-as-Code integration requirements, and reference status. Read-only resources and one integration-planning prompt are also registered. The machine-readable contract is in [`schemas/mcp-contract.json`](schemas/mcp-contract.json).

## What it deliberately does not do

This is not an MVDIO Supervisor and not an authorization service.

- It does not read an application's graph, evidence stores, policies, promotion records, or snapshots.
- It does not implement `μΩ`, generate executable domain policies, or derive a production `q_m` from a live mutation.
- It does not run `CheckAdmissionConflict`, `CheckClaimConflict`, or `EvaluateGraphConstraints` over application state.
- It does not issue `α_m`, perform Phase 1/Phase 2 authorization, commit or revert writes, or return a `PASS` / `BREACH` / `UNKNOWN_EVIDENCE` decision.
- It does not claim that dependency-aware evidence lineage or control of the full hypothesis-conditioned Plan–Act–Observe–Update loop is implemented. That remains future research in the paper.

The Reference Vocabulary provides canonical concepts. The Agentic ER and Policy-as-Code mappings are derived, non-normative application layers. Their example bindings are not universal domain policies.

## Web discovery

The service root is a single human-readable landing page. Its crawler and machine-discovery documents are served directly by the Worker:

- `/robots.txt` allows public documentation crawling, excludes the protocol and health endpoints, and points to the sitemap.
- `/sitemap.xml` lists the canonical homepage only; protocol and health endpoints are not indexable website pages.
- `/llms.txt` provides a concise service overview, endpoint guidance, tool/resource inventory, version context, and architectural boundaries.

The full technical definitions remain in the API contract, machine-readable contract, and examples linked above. There is intentionally no separate `llms-full.txt`.

## Architecture

```text
MCP client / Agentic ER application
        |
        | Streamable HTTP (POST /mcp)
        v
Cloudflare Worker: dio-odi-mcp
        |
        +-- versioned, bundled Reference Vocabulary snapshot (40 concepts)
        +-- Reconstruction Failure taxonomy (4 domains / 8 modes)
        +-- curated Agentic ER mapping extracts
        +-- evidence-promotion and commit-boundary contracts
        +-- Policy-as-Code integration mapping

Application-owned systems remain outside this Worker:
  graph state | evidence stores | domain policy | promotion validator
  MVDIO Supervisor | version/snapshot checks | atomic persistence
```

The Worker is stateless and read-only. It uses Cloudflare's `createMcpHandler` with the MCP TypeScript SDK v2 and accepts the stateless MCP `2026-07-28` protocol revision only (`legacy: "reject"`). It has no Durable Objects, database, KV namespace, external LLM API, or runtime dependency on the Reference Model site. The bundled snapshot keeps each request bounded and avoids a network subrequest for each tool call.

## Tool inventory

| Tool | Purpose |
|---|---|
| `get_mutation_guardrail_profile` | Main Agentic ER integration use case |
| `get_reconstruction_failure_profile` | Four domains, eight modes, diagnostic distinctions |
| `get_evidence_promotion_contract` | Quarantine, `UNVERIFIED`, `P_auth`, roles and promotion rules |
| `get_commit_boundary_contract` | Action classes, Phase 1, Phase 2, invariant and assumptions |
| `search_concepts` | Search the bundled canonical vocabulary snapshot |
| `get_concept` | Read one concept by URI, ID, preferred label or alternate label |
| `get_relations` | Read direct broader/narrower/related vocabulary links |
| `get_application_mapping` | Read a bounded Agentic ER mapping section or Policy-as-Code mapping |
| `get_policy_as_code_mapping` | Read 11 OPA/Rego and Cedar integration obligations |
| `get_reference_status` | Read current reference, mapping and live SCF version metadata |

Registered resources:

- `dio-odi://reference/status`
- `dio-odi://reference/vocabulary`
- `dio-odi://diagnostics/reconstruction-failure-taxonomy`
- `dio-odi://contracts/evidence-promotion`
- `dio-odi://contracts/commit-boundary`
- `dio-odi://mappings/agentic-er`
- `dio-odi://mappings/policy-as-code`

Registered prompt: `plan_mutation_guardrail_integration`.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run test
npm run typecheck
npm run dev
```

The local MCP endpoint is normally `http://localhost:8787/mcp`. The handler accepts native clients with no `Origin` header and checks browser `Origin` and request `Host` values against explicit allowlists. To add another browser-based client, update both `ALLOWED_ORIGINS` in `wrangler.jsonc` and `allowedOriginHostnames` in `src/index.ts`. Test it with:

The MCP Inspector 2.14.0 was tested against the pinned MCP revision `2026-07-28` but could not negotiate that revision. Do not use that Inspector version as a compatibility or release gate. The official MCP TypeScript SDK compatibility check is available as `node tests/sdk-client.mjs` after installing the test client dependency; it pins the supported protocol revision and verifies tools, resources, and the integration prompt.

## Deployment

The Worker is configured for `workers.dev` and the production Custom Domain `mcp.danielberanek.cz`. The MCP handler validates `Host` and `Origin`; the configured browser-origin host allowlist is intentionally narrow and native clients without an `Origin` header remain supported.

### First deployment from a local terminal

```bash
npm install
npm run check
npx wrangler login
npx wrangler deploy
```

Cloudflare Custom Domains create the DNS record and certificate for the Worker when a hostname is attached. Before deploying the production hostname, verify that the active Cloudflare zone is `danielberanek.cz` and that `mcp.danielberanek.cz` does not already have a conflicting CNAME record. Cloudflare's Custom Domain workflow cannot attach a Worker over an existing CNAME on that hostname.

### GitHub Actions deployment

The workflow `.github/workflows/deploy.yml` deploys after changes reach `main`. Add these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use a narrowly scoped API token with Workers Scripts edit access and the permissions required to attach the Custom Domain/DNS record in the `danielberanek.cz` zone. Do not put tokens in the repository, `wrangler.jsonc`, or public issues.

### Rate limiting

The Worker defines an approximate Cloudflare Rate Limiting binding of 600 requests per minute per client IP, evaluated per Cloudflare location. This is an abuse guard, not a strict global quota or user identity system. Shared networks may share one IP key. The `namespace_id` in `wrangler.jsonc` must be unique within the Cloudflare account; change it if that number is already used by another rate-limit binding.

The initial free Workers plan has finite account-level request and CPU allowances. Check the current Cloudflare plan and account usage before treating the endpoint as unlimited public infrastructure.

## Testing

Run the local deterministic unit and contract checks:

```bash
npm ci --no-audit --no-fund
npm run check
```

Run the public production smoke suite against the deployed service:

```bash
npm run test:remote
```

The remote suite uses Node.js built-in `fetch` and the MCP `2026-07-28` Streamable HTTP request contract. It checks the service root and health endpoint, server discovery, all ten tools, all seven resources, the integration prompt, selected semantic invariants, HTTP method handling, CORS behavior, and protocol-header validation. It writes a machine-readable report to `test-results/production-smoke.json`.

To target another deployment, set `MCP_BASE_URL` to its base URL before running the command. The suite is deliberately sequential and low-volume; it is not a load test and does not deliberately exhaust the configured rate limiter. A manual GitHub Actions workflow, **Production MCP Smoke Tests**, runs both the local checks and this public-endpoint suite and uploads the JSON report.

The remote suite requires Node.js 22 or later and no additional package dependencies. It is safe to run from a normal desktop connection; network latency is measured separately from local test execution time.

## Client configuration examples

Modern remote MCP clients use the URL directly:

```json
{
  "mcpServers": {
    "dio-odi": {
      "url": "https://mcp.danielberanek.cz/mcp"
    }
  }
}
```

Some clients still require a local proxy or a different remote transport configuration. Use the configuration format documented by that client; the Worker exposes Streamable HTTP and does not provide stdio.

## Snapshot and provenance policy

The bundled snapshot in `src/catalog.mjs` identifies:

- Reference Model archive v0.9.0, DOI `10.5281/zenodo.24085589`;
- Reference Vocabulary v0.2.2;
- Agentic ER mapping v0.3.1 (120 local architecture concepts and 206 qualified relation assertions);
- live SCF v0.1.4 / schema v0.2.1 / 50 events through 2026-11-11;
- Policy-as-Code mapping last modified 2026-11-09.

The Reference Model archive and live SCF are intentionally distinct: the live feed was maintained after the v0.9.0 archive. A later vocabulary or mapping update must change the bundled snapshot and its tests through a reviewed pull request. Do not silently overwrite archival version metadata with live values.

The concept index bundles 40 canonical concepts. The Agentic ER architecture extract contains the bounded sections and five constraint examples used by the primary tool; it is not a replacement for the full 120-concept / 206-assertion machine-readable mapping. The exact full mapping remains available from the source links returned by the service.

## Citation and archival metadata

The software is versioned independently from the DIO/ODI Reference Model. `v0.1.0` was the initial public software release. `v0.1.1` republishes the same functional implementation with the complete, corrected archival metadata after enabling the Zenodo GitHub integration; it does not introduce a new MCP capability or change the read-only service behavior. The repository-level `.zenodo.json` is the authoritative Zenodo metadata projection, and `CITATION.cff` provides GitHub-native citation metadata. When both files are present, Zenodo uses `.zenodo.json` and ignores `CITATION.cff`. The canonical ordered keyword sequence is projected from the Reference Model registry's `mcp-server` work profile. Zenodo has archived v0.1.1 with the version DOI [10.5281/zenodo.24123229](https://doi.org/10.5281/zenodo.24123229); the Concept DOI for the software across versions is [10.5281/zenodo.24123228](https://doi.org/10.5281/zenodo.24123228). The version DOI identifies this exact release; use the Concept DOI when citing the software independently of a specific version.

The Zenodo record uses MIT as the primary software license. This does not change the separate CC BY 4.0 license for embedded DIO/ODI content described below and in `data/ATTRIBUTION.md`.

## Citation

**Version 0.1.1:** [10.5281/zenodo.24123229](https://doi.org/10.5281/zenodo.24123229)  
**Concept DOI (all versions):** [10.5281/zenodo.24123228](https://doi.org/10.5281/zenodo.24123228)

Beránek, D. (2026). *DIO/ODI MCP: A Read-only Model Context Protocol Server for the DIO/ODI Reference Model and Agentic Entity Resolution Guardrail Mappings* (Version 0.1.1) [Software]. Zenodo. https://doi.org/10.5281/zenodo.24123229

## Licensing

- Source code: MIT; see `LICENSE`.
- DIO/ODI concept definitions and derived reference content reproduced from the DIO/ODI corpus: CC BY 4.0, with attribution and source links; see `data/ATTRIBUTION.md`.
- Third-party dependencies retain their own licenses.

## Development phases

This repository implements Phase 1 (Free read-only MCP MVP). Agentic ER local integration examples and implementation kit belong to Phase 2. Dependency-aware evidence-flow control is not part of this implementation and must not be advertised as a delivered feature.
