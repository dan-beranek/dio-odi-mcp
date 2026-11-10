# Operations and release procedure

## Production deployment

1. The Cloudflare Worker is named `dio-odi-mcp`.
2. The Custom Domain `mcp.danielberanek.cz` is managed in the Cloudflare Dashboard.
3. `wrangler.jsonc` intentionally omits `routes` and sets `workers_dev: false`; deploys update Worker code without managing the Custom Domain.
4. The GitHub Actions deploy workflow requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token should be scoped to the existing Worker with the minimum required Workers Editor role.
5. Deploy only through the manual **Deploy Cloudflare Worker** workflow.
6. Confirm the workflow succeeds, then check `https://mcp.danielberanek.cz/`, `/healthz`, and the public MCP endpoint at `/mcp`.

## Test layers

### Local unit and contract tests

```bash
npm ci --no-audit --no-fund
npm run check
```

These tests run without contacting the production service and verify the bundled vocabulary, taxonomy, profile logic, action-class separation, commit-boundary contract, and machine-readable MCP inventory.

### Remote production smoke and integration tests

```bash
npm run test:remote
```

The suite uses Node.js built-in `fetch`, requires no extra dependencies, and targets `https://mcp.danielberanek.cz` by default. Set `MCP_BASE_URL` to test another deployment. It tests:

- service root and health response;
- `server/discover`, `tools/list`, `resources/list`, and `prompts/list`;
- every registered tool with representative valid input;
- all seven resources through `resources/read`;
- the integration-planning prompt through `prompts/get`;
- read-only annotations and critical DIO/ODI semantic boundaries;
- HTTP method and unknown-path behavior;
- allowed and disallowed CORS origins;
- required MCP request headers and unsupported protocol-version handling.

The suite is sequential and low-volume. It writes `test-results/production-smoke.json` with individual outcomes and RPC latency samples. The manual **Production MCP Smoke Tests** GitHub Actions workflow runs `npm run check` and the remote suite, then uploads the report as an artifact.

The remote suite does not deliberately exhaust the rate limiter, test sustained high concurrency, or establish a capacity/SLO guarantee. Those require a separately approved load-test profile.

## Release checks

- `npm run check` passes.
- The manual Production MCP Smoke Tests workflow passes against the intended deployment.
- The MCP Inspector can discover the tools, resources, and prompt.
- The main mutation profile marks diagnostic-to-constraint examples as `illustrative`.
- `GET /mcp` returns 405; `POST /mcp` is the Streamable HTTP endpoint.
- The handler is configured with `legacy: "reject"` and serves MCP `2026-07-28` only.
- Invalid configured Origin is rejected; requests without Origin are accepted for native MCP clients.
- No API keys, LLM provider credentials, graph state, or evidence stores are present in the Worker.

## Updating the reference snapshot

When the canonical Reference Vocabulary or an application mapping changes:

1. inspect the corresponding merged Reference Model source and metadata;
2. update `src/catalog.mjs` and source/version fields;
3. preserve the separate archive and live SCF version lineages;
4. update tests and `data/ATTRIBUTION.md`;
5. submit a PR and review the diff against the canonical source;
6. run the local checks and production smoke suite against the candidate deployment;
7. deploy only after tests pass.

Do not automatically overwrite the bundled snapshot from an unreviewed remote fetch during a live MCP request.
