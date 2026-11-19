import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../src/page-metadata.json", import.meta.url), "utf8"));
const profile = manifest.artifacts.find((artifact) => artifact.profile_id === "dio-odi-mcp-home");

test("MCP exposes one approved homepage profile from registry 2.11.0", () => {
  assert.equal(manifest.keyword_registry.registry_version, "2.11.0");
  assert.equal(manifest.site.origin, "https://mcp.danielberanek.cz/");
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(profile.status, "canonical-approved");
  assert.equal(profile.scope, "derived-public-webpage");
  assert.equal(profile.page.path, "/");
  assert.equal(profile.page.entity_id, "https://mcp.danielberanek.cz/#webpage");
});

test("resolved keywords preserve the complete C0 identity invariant and selected scope", () => {
  assert.deepEqual(profile.resolved_keywords.slice(0, 6), [
    "Digital Identity Optimization", "DIO", "Ontology of Digital Identity",
    "ODI", "digital identity", "identity reconstruction"
  ]);
  assert.deepEqual(profile.resolved_keywords.slice(6, 9), [
    "read-only Model Context Protocol service",
    "canonical DIO/ODI reference interface",
    "Agentic ER integration reference"
  ]);
  assert.ok(profile.resolved_keywords.includes("Reconstruction Failure Modes"));
  assert.ok(profile.resolved_keywords.includes("SKOS"));
  assert.ok(profile.resolved_keywords.includes("provenance"));
  assert.ok(!profile.resolved_keywords.includes("artificial intelligence"));
  assert.ok(!profile.resolved_keywords.includes("K6 Semantic Connectome"));
  assert.ok(!profile.resolved_keywords.includes("MVDIO Supervisor"));
});

test("all non-invariant terms have profile-specific rationales", () => {
  const invariant = new Set(profile.resolved_keywords.slice(0, 6));
  const required = profile.resolved_keywords.filter((term) => !invariant.has(term));
  assert.deepEqual(Object.keys(profile.term_rationales).sort(), [...required].sort());
});
