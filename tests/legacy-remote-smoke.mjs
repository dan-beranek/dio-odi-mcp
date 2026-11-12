import assert from "node:assert/strict";

const DEFAULT_BASE_URL = "https://mcp.danielberanek.cz";
const LEGACY_PROTOCOL_VERSION = "2025-11-25";
const CLIENT_INFO = { name: "dio-odi-mcp-legacy-compatibility-test", version: "1.0.0" };
const base = new URL(process.env.MCP_BASE_URL ?? DEFAULT_BASE_URL);
const path = base.pathname.replace(/\/+$/, "");
const mcpUrl = path.endsWith("/mcp") ? base.href : new URL("/mcp", base).href;

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

const TOOL_CASES = [
  ["get_mutation_guardrail_profile", {
    actionClass: "IRREVERSIBLE_WRITE",
    mutationType: "MERGE",
    include: ["evidence_requirements", "commit_checks"]
  }],
  ["get_reconstruction_failure_profile", {}],
  ["get_evidence_promotion_contract", {}],
  ["get_commit_boundary_contract", {}],
  ["search_concepts", { query: "semantic fragmentation", limit: 5 }],
  ["get_concept", { identifier: "MergeFailure" }],
  ["get_relations", { identifier: "MergeFailure" }],
  ["get_application_mapping", { mapping: "agentic-er", section: "all" }],
  ["get_policy_as_code_mapping", {}],
  ["get_reference_status", {}]
];

let nextId = 0;
const checks = [];

function parseBody(contentType, raw) {
  if (!raw) return null;
  if (contentType.includes("text/event-stream")) {
    const data = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    assert.ok(data.length > 0, "SSE response did not contain a data event.");
    return JSON.parse(data.at(-1));
  }
  return JSON.parse(raw);
}

async function rpc(method, params = {}, { notification = false, sendProtocolHeader = true } = {}) {
  const body = {
    jsonrpc: "2.0",
    ...(notification ? {} : { id: ++nextId }),
    method,
    ...(Object.keys(params).length > 0 ? { params } : {})
  };

  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json"
  };
  if (sendProtocolHeader) headers["MCP-Protocol-Version"] = LEGACY_PROTOCOL_VERSION;

  const response = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = parseBody(response.headers.get("content-type") ?? "", raw);
  } catch (error) {
    throw new Error("Could not parse " + method + " response (HTTP " + response.status + "): " + error.message + "; body: " + raw.slice(0, 500));
  }
  return { response, payload, raw };
}

function resultOf(payload) {
  assert.ok(payload && typeof payload === "object", "Expected a JSON-RPC response.");
  assert.equal(payload.jsonrpc, "2.0");
  if (payload.error) throw new Error("JSON-RPC " + payload.error.code + ": " + payload.error.message);
  assert.ok(payload.result, "Expected JSON-RPC result.");
  return payload.result;
}

function toolData(result) {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent;
  }
  const item = result.content?.find((entry) => entry.type === "text");
  assert.ok(item?.text, "Tool returned no text or structured content.");
  return JSON.parse(item.text);
}

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, status: "PASS" });
    console.log("PASS  " + name);
  } catch (error) {
    checks.push({ name, status: "FAIL", error: error.message });
    console.error("FAIL  " + name + ": " + error.message);
  }
}

await check("legacy initialize handshake negotiates 2025-11-25", async () => {
  const { response, payload } = await rpc("initialize", {
    protocolVersion: LEGACY_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: CLIENT_INFO
  }, { sendProtocolHeader: false });

  assert.equal(response.status, 200);
  const result = resultOf(payload);
  assert.equal(result.protocolVersion, LEGACY_PROTOCOL_VERSION);
  assert.equal(result.serverInfo?.name, "dio-odi-mcp");
  assert.ok(result.capabilities?.tools);
  assert.ok(result.capabilities?.resources);
  assert.ok(result.capabilities?.prompts);
  assert.equal(response.headers.has("mcp-session-id"), false, "Stateless legacy mode must not issue a session ID.");
});

await check("legacy initialized notification is accepted", async () => {
  const { response, payload } = await rpc("notifications/initialized", {}, { notification: true });
  assert.equal(response.status, 202);
  assert.equal(payload, null);
});

let listedTools = [];
await check("legacy tools/list returns all ten read-only tools", async () => {
  const { response, payload } = await rpc("tools/list");
  assert.equal(response.status, 200);
  listedTools = resultOf(payload).tools;
  assert.deepEqual(listedTools.map((tool) => tool.name).sort(), [...EXPECTED_TOOLS].sort());
  assert.ok(listedTools.every((tool) => tool.annotations?.readOnlyHint === true));
  assert.ok(listedTools.every((tool) => tool.annotations?.destructiveHint === false));
});

await check("legacy resources/list returns all seven resources", async () => {
  const { response, payload } = await rpc("resources/list");
  assert.equal(response.status, 200);
  const resources = resultOf(payload).resources;
  assert.deepEqual(resources.map((resource) => resource.uri).sort(), [...EXPECTED_RESOURCES].sort());
});

await check("legacy prompts/list returns the integration prompt", async () => {
  const { response, payload } = await rpc("prompts/list");
  assert.equal(response.status, 200);
  const prompts = resultOf(payload).prompts;
  assert.ok(prompts.some((prompt) => prompt.name === "plan_mutation_guardrail_integration"));
});

for (const uri of EXPECTED_RESOURCES) {
  await check("legacy resources/read: " + uri, async () => {
    const { response, payload } = await rpc("resources/read", { uri });
    assert.equal(response.status, 200);
    const contents = resultOf(payload).contents;
    assert.ok(contents.length > 0);
    assert.equal(contents[0].uri, uri);
    assert.ok(contents[0].text.length > 0);
    JSON.parse(contents[0].text);
  });
}

await check("legacy prompts/get returns the integration-planning prompt", async () => {
  const { response, payload } = await rpc("prompts/get", {
    name: "plan_mutation_guardrail_integration",
    arguments: { actionClass: "IRREVERSIBLE_WRITE", mutationType: "MERGE" }
  });
  assert.equal(response.status, 200);
  const messages = resultOf(payload).messages;
  assert.ok(messages.length > 0);
  assert.match(messages[0].content.text, /DIO\/ODI-informed Agentic ER guardrail/);
});

for (const [name, args] of TOOL_CASES) {
  await check("legacy tools/call: " + name, async () => {
    assert.ok(listedTools.some((tool) => tool.name === name), name + " is not listed.");
    const { response, payload } = await rpc("tools/call", { name, arguments: args });
    assert.equal(response.status, 200);
    const result = resultOf(payload);
    assert.notEqual(result.isError, true);
    const data = toolData(result);
    assert.ok(data && typeof data === "object");
  });
}

const passed = checks.filter((item) => item.status === "PASS").length;
const failed = checks.length - passed;
console.log("\nLegacy compatibility summary: " + passed + "/" + checks.length + " checks passed.");
console.log("Protocol: " + LEGACY_PROTOCOL_VERSION + " (legacy stateless); endpoint: " + mcpUrl);
if (failed > 0) process.exitCode = 1;
