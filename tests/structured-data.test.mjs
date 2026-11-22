import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../src/page-metadata.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const identities = manifest.entity_registry;
const personNode = {
  "@type": "Person",
  "@id": identities.person.id,
  name: identities.person.name,
  url: identities.person.url,
  sameAs: identities.person.same_as
};
const softwareNode = {
  "@type": "SoftwareApplication",
  "@id": identities.service_software.id,
  name: identities.service_software.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  softwareVersion: packageJson.version,
  url: identities.service_software.url,
  codeRepository: "https://github.com/dan-beranek/dio-odi-mcp",
  sameAs: ["https://doi.org/10.5281/zenodo.24123229", "https://doi.org/10.5281/zenodo.24123228"],
  provider: { "@id": identities.person.id },
  isPartOf: { "@id": "https://mcp.danielberanek.cz/#website" }
};
const apiNode = {
  "@type": "WebAPI",
  "@id": identities.service_api.id,
  name: identities.service_api.name,
  url: identities.service_api.url,
  documentation: "https://mcp.danielberanek.cz/#tools",
  description: "A public, stateless, read-only Model Context Protocol interface to versioned DIO/ODI reference data and selected derived mappings. It does not inspect customer systems, instantiate domain policy, authorize mutations or execute production writes.",
  provider: { "@id": identities.person.id },
  mainEntityOfPage: { "@id": "https://mcp.danielberanek.cz/#webpage" },
  isPartOf: { "@id": "https://mcp.danielberanek.cz/#website" }
};

test("MCP homepage JSON-LD links canonical Person, WebAPI and WebPage", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  const jsonLdOpen = '<script type="application/ld+json">';
  const start = source.indexOf(jsonLdOpen);
  const openEnd = start < 0 ? -1 : source.indexOf(">", start) + 1;
  const end = openEnd < 0 ? -1 : source.indexOf("</script>", openEnd);
  assert.ok(start >= 0 && end >= 0, "Expected embedded homepage JSON-LD");
  const raw = source.slice(openEnd, end).trim()
    .replace("__PAGE_KEYWORDS_JSON__", JSON.stringify(manifest.artifacts[0].resolved_keywords))
    .replace("__SERVICE_VERSION__", packageJson.version)
    .replace("__PERSON_NODE_JSON__", JSON.stringify(personNode))
    .replace("__MCP_SOFTWARE_NODE_JSON__", JSON.stringify(softwareNode))
    .replace("__MCP_API_NODE_JSON__", JSON.stringify(apiNode));
  assert.ok(!raw.includes("__"), "All homepage JSON-LD placeholders must resolve");
  const parsed = JSON.parse(raw);
  const graph = parsed["@graph"];
  assert.ok(Array.isArray(graph));
  const byId = new Map(graph.map((node) => [node["@id"], node]));
  const person = byId.get("https://danielberanek.cz/#person");
  const webpage = byId.get("https://mcp.danielberanek.cz/#webpage");
  const api = byId.get("https://mcp.danielberanek.cz/#webapi");
  const software = byId.get("https://mcp.danielberanek.cz/#software");
  assert.equal(person?.["@type"], "Person");
  assert.equal(person?.["@id"], identities.person.id);
  assert.equal(person?.name, identities.person.name);
  assert.equal(person?.url, identities.person.url);
  assert.deepEqual(person?.sameAs, identities.person.same_as);
  assert.equal(webpage?.mainEntity?.["@id"], api?.["@id"]);
  assert.equal(api?.["@type"], "WebAPI");
  assert.equal(api?.url, "https://mcp.danielberanek.cz/mcp");
  assert.equal(api?.mainEntityOfPage?.["@id"], webpage?.["@id"]);
  assert.equal(api?.provider?.["@id"], person?.["@id"]);
  assert.equal(software?.["@type"], "SoftwareApplication");
  assert.equal(software?.["@id"], identities.service_software.id);
  assert.equal(software?.name, identities.service_software.name);
  assert.equal(software?.url, identities.service_software.url);
  assert.equal(software?.provider?.["@id"], person?.["@id"]);
  assert.ok(!graph.some((node) => node["@id"] === "https://mcp.danielberanek.cz/#product"));
});
