import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("MCP homepage JSON-LD links canonical Person, WebAPI and WebPage", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  const match = source.match(/<script type="application\\/ld\\+json">\\n([\\s\\S]*?)\\n<\\/script>/);
  assert.ok(match, "Expected embedded homepage JSON-LD");
  const raw = match[1].replace("__PAGE_KEYWORDS_JSON__", "[]");
  const parsed = JSON.parse(raw);
  const graph = parsed["@graph"];
  assert.ok(Array.isArray(graph));
  const byId = new Map(graph.map((node) => [node["@id"], node]));
  const person = byId.get("https://danielberanek.cz/#person");
  const webpage = byId.get("https://mcp.danielberanek.cz/#webpage");
  const api = byId.get("https://mcp.danielberanek.cz/#webapi");
  const software = byId.get("https://mcp.danielberanek.cz/#software");
  assert.equal(person?.["@type"], "Person");
  assert.equal(person?.mainEntityOfPage?.["@id"], "https://danielberanek.cz/od-pultu-az-k-seo-a-copy-s-ostrymi-hroty-profesni-bio/#profilepage");
  assert.equal(webpage?.mainEntity?.["@id"], api?.["@id"]);
  assert.equal(api?.["@type"], "WebAPI");
  assert.equal(api?.url, "https://mcp.danielberanek.cz/mcp");
  assert.equal(api?.mainEntityOfPage?.["@id"], webpage?.["@id"]);
  assert.equal(api?.provider?.["@id"], person?.["@id"]);
  assert.equal(software?.["@type"], "SoftwareApplication");
  assert.equal(software?.provider?.["@id"], person?.["@id"]);
  assert.ok(!graph.some((node) => node["@id"] === "https://mcp.danielberanek.cz/#product"));
});
