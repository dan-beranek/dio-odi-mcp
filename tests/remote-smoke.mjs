import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "https://mcp.danielberanek.cz";
const PROTOCOL_VERSION = "2026-07-28";
const CLIENT_INFO = { name: "dio-odi-mcp-production-smoke", version: "1.0.0" };
const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": CLIENT_INFO
};

function resolveUrls(raw) {
  const base = new URL(raw);
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("MCP_BASE_URL must use HTTPS (HTTP is allowed only for localhost).");
  }
  const trimmedPath = base.pathname.replace(/\\/+$/, "");
  const rootPath = trimmedPath.endsWith("/mcp") ? trimmedPath.slice(0, -4) : trimmedPath;
  const mcpPath = trimmedPath.endsWith("/mcp") ? trimmedPath : `${trimmedPath}/mcp`;
  return {
    origin: base.origin,
    root: `${base.origin}${rootPath || "/"}`,
    health: `${base.origin}${rootPath}/healthz`,
    mcp: `${base.origin}${mcpPath}`
  };
}

const urls = resolveUrls(process.env.MCP_BASE_URL ?? DEFAULT_BASE_URL);
let requestId = 0;
const checks = [];
const timings = [];

function parseResponseBody(contentType, raw) {
  if (contentType.includes("text/event-stream")) {
    const data = raw.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
    if (data.length === 0) throw new Error("SSE response did not contain a data event.");
    return JSON.parse(data.at(-1));
  }
  if (!raw) return null;
  return JSON.parse(raw);
}

async function rpc(method, params = {}, { name, protocolVersion = PROTOCOL_VERSION, methodHeader = method } = {}) {
  const id = ++requestId;
  const body = {
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        ...CLIENT_META,
        "io.modelcontextprotocol/protocolVersion": protocolVersion
      }
    }
  };
  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": protocolVersion,
    "Mcp-Method": methodHeader
  };
  if (name !== undefined) headers["Mcp-Name"] = name;

  const started = performance.now();
  const response = await fetch(urls.mcp, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const elapsedMs = Number((performance.now() - started).toFixed(1));
  const raw = await response.text();
  let payload = null;
  try {
    payload = parseResponseBody(response.headers.get("content-type") ?? "", raw);
  } catch (error) {
    throw new Error(`Could not parse MCP response (HTTP ${response.status}): ${error.message}; body: ${raw.slice(0, 500)}`);
  }
  timings.push({ method, name: name ?? null, status: response.status, elapsedMs });
  return { response, payload, raw, elapsedMs };
}

function resultOf(payload) {
  assert.ok(payload && typeof payload === "object", "Expected a JSON response object.");
  assert.equal(payload.jsonrpc, "2.0");
  if (payload.error) throw new Error(`JSON-RPC ${payload.error.code}: ${payload.error.message}`);
  assert.ok(payload.result, "Expected JSON-RPC result.");
  return payload.result;
}

function toolData(result) {
  if (result.structuredContent) return result.structuredContent;
  const textItem = result.content?.find((item) => item.type === "text");
  assert.ok(textItem?.text, "Tool returned neither structuredContent nor a text result.");
  return JSON.parse(textItem.text);
}

async function check(name, fn) {
  const started = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - started).toFixed(1));
    checks.push({ name, status: "PASS", durationMs });
    console.log(`PASS  ${name} (${durationMs} ms)`);
  } catch (error) {
    const durationMs = Number((performance.now() - started).toFixed(1));
    checks.push({ name, status: "FAIL", durationMs, error: error.message });
    console.error(`FAIL  ${name}: ${error.message}`);
  }
}

async function callTool(name, args = {}) {
  const { response, payload } = await rpc("tools/call", { name, arguments: args }, { name });
  assert.equal(response.status, 200, `${name}: expected HTTP 200, got ${response.status}: ${JSON.stringify(payload)}`);
  return toolData(resultOf(payload));
}

const EXPECTED_TOOLS = [
  "get_mutation_guardrail_profile",
  "get_reconstruction_failure_profile",
  "get_evidence_promotion_contract",
  "get_commit_boundary_contract",
  "search_concepts",
  "get_concept",
  "get_relations",
  "get_application_mapping",
  "get_policy_as_code_mapping",
  "get_reference_status"
];

const EXPECTED_RESOURCES = [
  "dio-odi://reference/status",
  "dio-odi://reference/vocabulary",
  "dio-odi://diagnostics/reconstruction-failure-taxonomy",
  "dio-odi://contracts/evidence-promotion",
  "dio-odi://contracts/commit-boundary",
  "dio-odi://mappings/agentic-er",
  "dio-odi://mappings/policy-as-code"
];

await check("service root is reachable", async () => {
  const response = await fetch(urls.root, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /DIO\/ODI MCP/);
});

await check("health endpoint reports expected service and versions", async () => {
  const response = await fetch(urls.health, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "ok");
  assert.equal(data.service, "dio-odi-mcp");
  assert.equal(data.mode, "read-only");
  assert.equal(data.referenceModel, "0.9.0");
  assert.equal(data.vocabulary, "0.2.2");
  assert.equal(data.mapping, "0.3.1");
});

await check("MCP server discovery advertises protocol and identity", async () => {
  const { response, payload } = await rpc("server/discover");
  assert.equal(response.status, 200);
  const result = resultOf(payload);
  assert.ok(result.supportedVersions.includes(PROTOCOL_VERSION));
  assert.equal(result._meta["io.modelcontextprotocol/serverInfo"].name, "dio-odi-mcp");
  assert.equal(result._meta["io.modelcontextprotocol/serverInfo"].version, "0.1.0");
});

let discoveredTools = [];
await check("tools/list publishes the ten expected read-only tools", async () => {
  const { response, payload } = await rpc("tools/list");
  assert.equal(response.status, 200);
  discoveredTools = resultOf(payload).tools;
  assert.deepEqual(discoveredTools.map((tool) => tool.name).sort(), [...EXPECTED_TOOLS].sort());
  assert.ok(discoveredTools.every((tool) => tool.annotations?.readOnlyHint === true));
  assert.ok(discoveredTools.every((tool) => tool.annotations?.destructiveHint === false));
});

await check("resources/list publishes the seven expected resources", async () => {
  const { response, payload } = await rpc("resources/list");
  assert.equal(response.status, 200);
  const resources = resultOf(payload).resources;
  assert.deepEqual(resources.map((resource) => resource.uri).sort(), [...EXPECTED_RESOURCES].sort());
});

await check("prompts/list publishes the integration-planning prompt", async () => {
  const { response, payload } = await rpc("prompts/list");
  assert.equal(response.status, 200);
  const prompts = resultOf(payload).prompts;
  assert.ok(prompts.some((prompt) => prompt.name === "plan_mutation_guardrail_integration"));
});

for (const uri of EXPECTED_RESOURCES) {
  await check(`resources/read: ${uri}`, async () => {
    const { response, payload } = await rpc("resources/read", { uri }, { name: uri });
    assert.equal(response.status, 200);
    const contents = resultOf(payload).contents;
    assert.ok(contents.length > 0);
    assert.equal(contents[0].uri, uri);
    assert.ok(contents[0].text.length > 0);
    JSON.parse(contents[0].text);
  });
}

await check("prompts/get returns an integration-planning message", async () => {
  const name = "plan_mutation_guardrail_integration";
  const { response, payload } = await rpc("prompts/get", {
    name,
    arguments: { actionClass: "IRREVERSIBLE_WRITE", mutationType: "MERGE" }
  }, { name });
  assert.equal(response.status, 200);
  const messages = resultOf(payload).messages;
  assert.ok(messages.length > 0);
  assert.match(messages[0].content.text, /DIO\/ODI-informed Agentic ER guardrail/);
});

const toolCases = [
  ["get_mutation_guardrail_profile", { actionClass: "IRREVERSIBLE_WRITE", mutationType: "MERGE", include: ["evidence_requirements", "commit_checks"] }, (data) => {
    assert.equal(data.actionClass, "IRREVERSIBLE_WRITE");
    assert.equal(data.mutationType, "MERGE");
    assert.equal(data.selectedDiagnosticDomains.length, 4);
    assert.ok(data.diagnosticToConstraintMappings.length >= 4);
    assert.ok(data.diagnosticToConstraintMappings.every((item) => item.epistemicStatus === "illustrative"));
    assert.ok(data.actionContract.phase1.length > 0);
    assert.ok(data.actionContract.phase2.length > 0);
    assert.ok(data.evidencePromotionContract.promotionRequirements.length >= 7);
    assert.ok(data.commitBoundaryContract.phase1.length > 0);
    assert.ok(data.commitBoundaryContract.phase2.length > 0);
    assert.match(data.decisionBoundary, /not a policy decision/);
  }],
  ["get_reconstruction_failure_profile", {}, (data) => {
    assert.equal(data.selectedDomains.length, 4);
    assert.equal(data.failureModeCount, 8);
    assert.equal(data.identityCollapse.status, "phenomenon-level; not a fifth branch");
    assert.equal(data.semanticVulnerability.status, "robustness-related property; not a realized failure mode");
  }],
  ["get_evidence_promotion_contract", {}, (data) => {
    assert.equal(data.admission.firstState, "QUARANTINE_EVIDENCE");
    assert.equal(data.promotionRequirements.length, 7);
    assert.ok(data.claimConflictCheck.outcomes.includes("INDETERMINATE"));
  }],
  ["get_commit_boundary_contract", {}, (data) => {
    assert.ok(data.phase1.length > 0);
    assert.ok(data.phase2.length > 0);
    assert.deepEqual(data.precedence, ["BREACH", "UNKNOWN_EVIDENCE", "PASS"]);
  }],
  ["search_concepts", { query: "semantic fragmentation", limit: 5 }, (data) => {
    assert.ok(data.concepts.some((concept) => concept.id === "SemanticFragmentation"));
  }],
  ["get_concept", { identifier: "MergeFailure" }, (data) => {
    assert.equal(data.found, true);
    assert.equal(data.concept.id, "MergeFailure");
  }],
  ["get_relations", { identifier: "MergeFailure" }, (data) => {
    assert.equal(data.concept.id, "MergeFailure");
    assert.ok(data.broader.some((concept) => concept.id === "ReferentialReconstructionFailure"));
  }],
  ["get_application_mapping", { mapping: "agentic-er", section: "all" }, (data) => {
    assert.equal(data.metadata.version, "0.3.1");
    assert.ok(data.sections.overview);
    assert.ok(data.sections.evidence);
    assert.ok(data.sections.boundary);
  }],
  ["get_policy_as_code_mapping", {}, (data) => {
    assert.ok(data.obligations.length > 0);
    assert.match(data.integrationBoundary, /policy inputs/);
  }],
  ["get_reference_status", {}, (data) => {
    assert.equal(data.referenceModel.archivedVersion, "0.9.0");
    assert.equal(data.referenceVocabulary.version, "0.2.2");
    assert.equal(data.applicationMappings.agenticEr.version, "0.3.1");
    assert.ok(data.semanticChangeFeed.events >= 1);
  }]
];

for (const [name, args, validate] of toolCases) {
  await check(`tools/call: ${name}`, async () => {
    assert.ok(discoveredTools.some((tool) => tool.name === name), `${name} was not advertised by tools/list`);
    const data = await callTool(name, args);
    validate(data);
  });
}

await check("GET /mcp is rejected with HTTP 405", async () => {
  const response = await fetch(urls.mcp, { method: "GET", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 405);
  assert.match(response.headers.get("allow") ?? "", /POST/);
});

await check("unknown service path returns HTTP 404", async () => {
  const response = await fetch(`${urls.origin}/__dio_odi_test_not_found__`, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 404);
});

await check("allowed CORS preflight is accepted", async () => {
  const response = await fetch(urls.mcp, {
    method: "OPTIONS",
    headers: { Origin: "https://chatgpt.com" },
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://chatgpt.com");
});

await check("disallowed Origin is rejected with HTTP 403", async () => {
  const response = await fetch(urls.mcp, {
    method: "POST",
    headers: { Origin: "https://not-authorized.invalid", "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 403);
});

await check("missing Mcp-Name is rejected for a named tool call", async () => {
  const { response, payload } = await rpc("tools/call", { name: "get_reference_status", arguments: {} });
  assert.equal(response.status, 400);
  assert.equal(payload.error?.code, -32020);
});

await check("Mcp-Method mismatch is rejected", async () => {
  const { response, payload } = await rpc("tools/list", {}, { methodHeader: "prompts/list" });
  assert.equal(response.status, 400);
  assert.equal(payload.error?.code, -32020);
});

await check("unsupported protocol version is rejected explicitly", async () => {
  const { response, payload } = await rpc("server/discover", {}, { protocolVersion: "2025-06-18" });
  assert.equal(response.status, 400);
  assert.equal(payload.error?.code, -32022);
  assert.ok(payload.error?.data?.supported?.includes(PROTOCOL_VERSION));
});

const passed = checks.filter((item) => item.status === "PASS").length;
const failed = checks.length - passed;
const sortedLatencies = timings.map((item) => item.elapsedMs).sort((a, b) => a - b);
const percentile = (values, p) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] : null;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: urls.origin,
  protocolVersion: PROTOCOL_VERSION,
  summary: { total: checks.length, passed, failed },
  rpcLatencyMs: {
    samples: timings.length,
    median: percentile(sortedLatencies, 0.5),
    p95: percentile(sortedLatencies, 0.95),
    maximum: sortedLatencies.at(-1) ?? null
  },
  checks,
  requests: timings
};

await mkdir("test-results", { recursive: true });
await writeFile("test-results/production-smoke.json", JSON.stringify(report, null, 2) + "\n", "utf8");
console.log("\nProduction smoke test summary");
console.log(`Checks: ${passed}/${checks.length} passed; ${failed} failed.`);
console.log(`MCP RPC latency: n=${timings.length}, median=${report.rpcLatencyMs.median} ms, p95=${report.rpcLatencyMs.p95} ms, max=${report.rpcLatencyMs.maximum} ms`);
console.log("Report: test-results/production-smoke.json");

if (failed > 0) process.exitCode = 1;
