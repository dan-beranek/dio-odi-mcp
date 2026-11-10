import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.env.MCP_URL ?? "https://mcp.danielberanek.cz/mcp";
const protocolVersion = "2026-07-28";
const expectedTools = [
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
const expectedResources = [
  "dio-odi://reference/status",
  "dio-odi://reference/vocabulary",
  "dio-odi://diagnostics/reconstruction-failure-taxonomy",
  "dio-odi://contracts/evidence-promotion",
  "dio-odi://contracts/commit-boundary",
  "dio-odi://mappings/agentic-er",
  "dio-odi://mappings/policy-as-code"
];

const client = new Client(
  { name: "dio-odi-mcp-sdk-compatibility-test", version: "1.0.0" },
  { versionNegotiation: { mode: { pin: protocolVersion } } }
);
const transport = new StreamableHTTPClientTransport(new URL(endpoint));
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
    console.log(`PASS  ${name}`);
  } catch (error) {
    checks.push({ name, status: "FAIL", error: error.message });
    console.error(`FAIL  ${name}: ${error.message}`);
    throw error;
  }
}

function parseToolResult(result) {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent;
  }
  const item = result.content?.find((entry) => entry.type === "text");
  assert.ok(item?.text, "Tool returned no text or structured content.");
  return JSON.parse(item.text);
}

try {
  console.log(`Connecting official MCP TypeScript SDK to ${endpoint}`);
  await client.connect(transport);

  check("SDK negotiated the pinned 2026-07-28 protocol", () => {
    assert.equal(client.getProtocolEra(), "modern");
    assert.ok(client.getDiscoverResult(), "Expected server/discover result.");
  });

  const { tools } = await client.listTools();
  check("SDK lists all ten expected tools", () => {
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [...expectedTools].sort());
  });

  const { resources } = await client.listResources();
  check("SDK lists all seven expected resources", () => {
    assert.deepEqual(resources.map((resource) => resource.uri).sort(), [...expectedResources].sort());
  });

  const { prompts } = await client.listPrompts();
  check("SDK lists the integration-planning prompt", () => {
    assert.ok(prompts.some((prompt) => prompt.name === "plan_mutation_guardrail_integration"));
  });

  const statusResource = await client.readResource({ uri: "dio-odi://reference/status" });
  check("SDK reads the reference status resource", () => {
    assert.ok(statusResource.contents.length > 0);
    assert.equal(statusResource.contents[0].uri, "dio-odi://reference/status");
    const data = JSON.parse(statusResource.contents[0].text);
    assert.equal(data.referenceModel.archivedVersion, "0.9.0");
    assert.equal(data.referenceVocabulary.version, "0.2.2");
  });

  const vocabularyResource = await client.readResource({ uri: "dio-odi://reference/vocabulary" });
  check("SDK reads the canonical vocabulary resource", () => {
    assert.ok(vocabularyResource.contents.length > 0);
    assert.equal(vocabularyResource.contents[0].uri, "dio-odi://reference/vocabulary");
    const data = JSON.parse(vocabularyResource.contents[0].text);
    assert.ok(Array.isArray(data.concepts));
    assert.ok(data.concepts.length > 0);
  });

  const statusResult = await client.callTool({ name: "get_reference_status", arguments: {} });
  check("SDK calls get_reference_status and parses its result", () => {
    assert.notEqual(statusResult.isError, true);
    const data = parseToolResult(statusResult);
    assert.equal(data.referenceModel.archivedVersion, "0.9.0");
    assert.equal(data.applicationMappings.agenticEr.version, "0.3.1");
  });

  const conceptResult = await client.callTool({
    name: "get_concept",
    arguments: { identifier: "MergeFailure" }
  });
  check("SDK calls get_concept and parses its result", () => {
    assert.notEqual(conceptResult.isError, true);
    const data = parseToolResult(conceptResult);
    assert.equal(data.found, true);
    assert.equal(data.concept.id, "MergeFailure");
  });

  const prompt = await client.getPrompt({
    name: "plan_mutation_guardrail_integration",
    arguments: { actionClass: "IRREVERSIBLE_WRITE", mutationType: "MERGE" }
  });
  check("SDK retrieves and expands the integration-planning prompt", () => {
    assert.ok(prompt.messages.length > 0);
    assert.match(prompt.messages[0].content.text, /DIO\/ODI-informed Agentic ER guardrail/);
  });

  console.log(`\nSDK compatibility summary: ${checks.length}/${checks.length} checks passed.`);
  console.log(`Protocol era: ${client.getProtocolEra()}; endpoint: ${endpoint}`);
} finally {
  await client.close();
}
