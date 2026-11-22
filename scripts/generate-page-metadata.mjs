#!/usr/bin/env node
/**
 * Generate and validate the MCP homepage metadata projection from the canonical DIO/ODI registry.
 * --write refreshes the committed registry snapshot from the canonical source (with snapshot fallback).
 * --check is hermetic and validates the generated Worker manifest against the committed snapshot.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY = "dan-beranek/dio-odi-mcp";
const PROFILE_ID = "dio-odi-mcp-home";
const REGISTRY_URL = "https://raw.githubusercontent.com/dan-beranek/dio-odi-reference-model/main/metadata/keywords.json";
const SNAPSHOT = resolve(ROOT, "metadata/keyword-registry.snapshot.json");
const OUTPUT = resolve(ROOT, "src/page-metadata.json");
const ENTITY_LOCK_PATH = resolve(ROOT, "metadata/entity-registry.lock.json");
const ENTITY_SNAPSHOT_PATH = resolve(ROOT, "metadata/entity-registry.snapshot.json");
const ENTITY_LOCK = JSON.parse(await readFile(ENTITY_LOCK_PATH, "utf8"));
const ENTITY_REGISTRY = JSON.parse(await readFile(ENTITY_SNAPSHOT_PATH, "utf8"));
if (ENTITY_REGISTRY.status !== "canonical-approved" ||
    ENTITY_REGISTRY.registry_version !== ENTITY_LOCK.registry_version ||
    !/^[0-9a-f]{40}$/.test(ENTITY_LOCK.registry_commit ?? "")) {
  throw new Error("Pinned Entity Registry is missing, unapproved, or inconsistent with its lock.");
}
function requiredEntity(key) {
  const entity = ENTITY_REGISTRY.entities.find((item) => item.key === key && item.status === "active");
  if (!entity) throw new Error("Missing active Entity Registry identity: " + key);
  return entity;
}
const PERSON_ENTITY = requiredEntity("person-daniel-beranek");
const MCP_API_ENTITY = requiredEntity("service-dio-odi-mcp-api");
const MCP_SOFTWARE_ENTITY = requiredEntity("software-dio-odi-mcp");
const CHUNK_ORDER = [
  "C0_identity_invariant", "C1_reconstruction_environments", "C2_work_positioning",
  "C3_reconstruction_mechanics", "C4_k6", "C5_failures_robustness",
  "C6_machine_readable_representation"
];

async function loadRegistry(refresh) {
  if (refresh) {
    try {
      const response = await fetch(REGISTRY_URL, {
        headers: { "User-Agent": "DIO-ODI-MCP-page-metadata-builder/1.0" },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error("Canonical registry returned HTTP " + response.status);
      return await response.text();
    } catch (error) {
      console.warn("Canonical registry unavailable; using committed snapshot:", error.message);
    }
  }
  return readFile(SNAPSHOT, "utf8");
}

function resolveKeywords(registry, profile) {
  if (profile.status !== "canonical-approved" || profile.scope !== "derived-public-webpage") {
    throw new Error(PROFILE_ID + ": profile is not an approved public webpage");
  }
  const selectors = profile.chunks ?? {};
  const chunks = registry.chunks ?? {};
  if (selectors.C0_identity_invariant !== "all" || !Array.isArray(selectors.C1_reconstruction_environments)) {
    throw new Error(PROFILE_ID + ": C0 must be complete and C1 must be explicitly selected");
  }
  const terms = [];
  for (const name of CHUNK_ORDER) {
    const source = chunks[name]?.terms;
    const choice = selectors[name];
    if (!Array.isArray(source) || choice === undefined) throw new Error(PROFILE_ID + ": missing chunk " + name);
    let selected;
    if (choice === "all") selected = [...source];
    else if (choice === "none") selected = [];
    else if (Array.isArray(choice)) {
      selected = [...choice];
      if (new Set(selected).size !== selected.length) throw new Error(PROFILE_ID + ": duplicate term in " + name);
      // C2 terms are work-specific and are intentionally not constrained by the empty global C2 list.
      if (name !== "C2_work_positioning") {
        const indexes = selected.map((term) => source.indexOf(term));
        if (indexes.some((index) => index < 0) ||
            indexes.some((value, index) => index > 0 && value <= indexes[index - 1])) {
          throw new Error(PROFILE_ID + ": invalid or out-of-order selection in " + name);
        }
      }
    } else throw new Error(PROFILE_ID + ": invalid selector in " + name);
    if (name === "C0_identity_invariant" && (choice !== "all" || selected.length !== source.length)) {
      throw new Error(PROFILE_ID + ": C0 identity invariant must be complete");
    }
    if (name === "C4_k6" && choice !== "all" && choice !== "none") {
      throw new Error(PROFILE_ID + ": K6 must be selected as a complete block or not at all");
    }
    terms.push(...selected);
  }
  if (new Set(terms.map((term) => term.toLocaleLowerCase("en"))).size !== terms.length) {
    throw new Error(PROFILE_ID + ": duplicate resolved keyword");
  }
  const invariant = new Set(chunks.C0_identity_invariant.terms);
  const requiredRationales = terms.filter((term) => !invariant.has(term));
  const rationales = profile.term_rationales ?? {};
  if (requiredRationales.length !== Object.keys(rationales).length ||
      requiredRationales.some((term) => !Object.hasOwn(rationales, term))) {
    throw new Error(PROFILE_ID + ": term rationale coverage mismatch");
  }
  return terms;
}

function build(raw) {
  const registry = JSON.parse(raw);
  if (registry.status !== "canonical-approved" || !/^2\.\d+\.\d+$/.test(registry.registry_version ?? "")) {
    throw new Error("Unsupported or unapproved canonical registry");
  }
  const profile = registry.surface_profiles?.[PROFILE_ID];
  if (!profile || profile.surface?.repository !== REPOSITORY) throw new Error("Canonical MCP surface profile is missing");
  if (JSON.stringify(profile.surface.paths) !== JSON.stringify(["/"]) ||
      JSON.stringify(profile.surface.urls) !== JSON.stringify(["https://mcp.danielberanek.cz/"]) ||
      profile.surface.entity_id !== "https://mcp.danielberanek.cz/#webpage") {
    throw new Error(PROFILE_ID + ": homepage-only surface scope mismatch");
  }
  const resolved = resolveKeywords(registry, profile);
  const digest = createHash("sha256").update(raw, "utf8").digest("hex");
  const artifact = {
    profile_id: PROFILE_ID,
    status: profile.status,
    scope: profile.scope,
    purpose: profile.purpose,
    page: {
      page_key: profile.surface.page_key,
      path: "/",
      url: profile.surface.urls[0],
      entity_id: profile.surface.entity_id
    },
    chunk_selectors: profile.chunks,
    resolved_keywords: resolved,
    term_rationales: profile.term_rationales
  };
  return {
    schema_version: "1.1.0",
    site: { repository: REPOSITORY, origin: "https://mcp.danielberanek.cz/" },
    entity_registry: {
      repository: ENTITY_LOCK.registry_repository,
      version: ENTITY_REGISTRY.registry_version,
      commit: ENTITY_LOCK.registry_commit,
      source_url: "https://raw.githubusercontent.com/" + ENTITY_LOCK.registry_repository + "/" + ENTITY_LOCK.registry_commit + "/" + ENTITY_LOCK.source_path,
      snapshot_path: ENTITY_LOCK.snapshot_path,
      person: {
        id: PERSON_ENTITY["@id"],
        name: PERSON_ENTITY.name,
        url: PERSON_ENTITY.url,
        same_as: PERSON_ENTITY.sameAs ?? []
      },
      service_api: {
        id: MCP_API_ENTITY["@id"],
        name: MCP_API_ENTITY.name,
        url: MCP_API_ENTITY.url,
        landing_page: MCP_API_ENTITY.landing_page
      },
      service_software: {
        id: MCP_SOFTWARE_ENTITY["@id"],
        name: MCP_SOFTWARE_ENTITY.name,
        url: MCP_SOFTWARE_ENTITY.url
      }
    },
    keyword_registry: {
      repository: "dan-beranek/dio-odi-reference-model",
      path: "metadata/keywords.json",
      registry_version: registry.registry_version,
      status: registry.status,
      sha256: digest,
      source_url: REGISTRY_URL,
      snapshot_path: "metadata/keyword-registry.snapshot.json"
    },
    artifacts: [artifact]
  };
}

async function main() {
  const mode = process.argv[2] ?? "--check";
  if (mode !== "--check" && mode !== "--write") throw new Error("Use --check or --write");
  const raw = await loadRegistry(mode === "--write");
  const expected = JSON.stringify(build(raw), null, 2) + "\n";
  if (mode === "--check") {
    const actual = await readFile(OUTPUT, "utf8").catch(() => null);
    if (actual !== expected) {
      console.error("Generated MCP page metadata is stale. Run: npm run metadata:write");
      process.exitCode = 1;
      return;
    }
    console.log("MCP page metadata is reproducible from the committed canonical registry snapshot.");
    return;
  }
  await mkdir(dirname(SNAPSHOT), { recursive: true });
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(SNAPSHOT, raw, "utf8");
  await writeFile(OUTPUT, expected, "utf8");
  console.log("Generated " + PROFILE_ID + " from canonical registry " + JSON.parse(raw).registry_version);
}

main().catch((error) => {
  console.error("MCP page metadata build failed:", error.message);
  process.exitCode = 1;
});
