# Operations and release procedure

## Before the first production deployment

1. Create the GitHub repository `dan-beranek/dio-odi-mcp` and upload/merge this project.
2. Run `npm install`, commit the generated `package-lock.json`, then run `npm run check`.
3. Create a Cloudflare API token with the minimum Workers deployment and zone/DNS permissions required for the target Custom Domain.
4. Confirm `danielberanek.cz` is an active Cloudflare zone and `mcp.danielberanek.cz` has no conflicting CNAME record.
5. Add GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
6. Deploy. Confirm the worker's `workers.dev` endpoint and then `https://mcp.danielberanek.cz/healthz` and `/mcp` with the MCP Inspector.

## Release checks

- `npm run check` passes.
- All ten tools/resources/prompts are discoverable by MCP Inspector.
- The main profile marks all constraint examples `illustrative`.
- Tests verify 4 diagnostic domains, 8 failure modes, the non-exclusive taxonomy, Identity Collapse, Semantic Vulnerability, Entity Omission boundaries, and action-class separation.
- `GET /mcp` returns 405; `POST /mcp` is the Streamable HTTP endpoint. The handler is configured with `legacy: "reject"` and serves MCP `2026-07-28` only.
- Invalid configured Origin or Host is rejected by the handler and the outer CORS allowlist; requests without Origin are accepted for native MCP clients.
- No API keys, LLM provider credentials, graph state or evidence stores are present in the Worker.

## Updating the reference snapshot

When the canonical Reference Vocabulary or an application mapping changes:

1. inspect the corresponding merged Reference Model source and metadata;
2. update `src/catalog.mjs` and source/version fields;
3. preserve the separate archive and live SCF version lineages;
4. update tests and `data/ATTRIBUTION.md`;
5. submit a PR and review the diff against the canonical source;
6. deploy only after tests pass.

Do not automatically overwrite the bundled snapshot from an unreviewed remote fetch during a live MCP request.
