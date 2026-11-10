import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CONCEPTS, FAILURE_DOMAINS, RESOURCE_DOCS } from "../src/catalog.mjs";
import {
  buildMutationGuardrailProfile,
  findConcept,
  getReconstructionFailureProfile,
  getRelations,
  getCommitBoundaryContract,
  searchConcepts
} from "../src/profile.mjs";

test("vocabulary snapshot contains 40 concepts and expected 4-domain / 8-mode taxonomy", () => {
  assert.equal(CONCEPTS.length, 40);
  assert.equal(FAILURE_DOMAINS.length, 4);
  assert.equal(FAILURE_DOMAINS.reduce((n, d) => n + d.failureModes.length, 0), 8);
});

test("Identity Collapse is not a fifth branch and Semantic Vulnerability is not a failure mode", () => {
  const profile = getReconstructionFailureProfile();
  assert.equal(profile.selectedDomains.length, 4);
  assert.equal(profile.failureModeCount, 8);
  assert.equal(profile.identityCollapse.status, "phenomenon-level; not a fifth branch");
  assert.equal(profile.semanticVulnerability.status, "robustness-related property; not a realized failure mode");
  assert.equal(profile.definitions.some((x) => x.id === "IdentityCollapse"), false);
  assert.equal(profile.definitions.some((x) => x.id === "SemanticVulnerability"), false);
});

test("Semantic Fragmentation and Split Failure remain distinct concepts", () => {
  const frag = findConcept("SemanticFragmentation");
  const split = findConcept("SplitFailure");
  assert.ok(frag.definition.includes("referentially continuous"));
  assert.ok(split.definition.includes("two or more distinct referential identities"));
});

test("MERGE guardrail profile returns illustrative bindings and two commit phases", () => {
  const profile = buildMutationGuardrailProfile({
    actionClass: "IRREVERSIBLE_WRITE",
    mutationType: "MERGE",
    entityClass: "legal-entity",
    observationDomain: "corporate-compliance",
    temporalScope: "valid-time interval",
    domainPolicyVersion: "policy-1"
  });
  assert.ok(profile.diagnosticToConstraintMappings.length >= 4);
  assert.ok(profile.diagnosticToConstraintMappings.every((x) => x.epistemicStatus === "illustrative"));
  assert.ok(profile.actionContract.phase1.length > 0);
  assert.ok(profile.actionContract.phase2.length > 0);
  assert.equal(profile.notSuppliedContextFields.length, 0);
  assert.equal(profile.referenceVersions.agenticErMapping.version, "0.3.1");
  assert.equal(profile.referenceVersions.referenceVocabulary.version, "0.2.2");
  assert.match(profile.decisionBoundary, /not a policy decision/);
});

test("READ only exposes admission semantics and does not grant promotion", () => {
  const profile = buildMutationGuardrailProfile({ actionClass: "READ", mutationType: "MERGE" });
  assert.ok(profile.actionContract.admissionCheck.includes("CheckAdmissionConflict"));
  assert.ok(profile.actionContract.prohibits.some((x) => x.includes("Do not promote")));
  assert.equal(profile.actionContract.phase1, undefined);
});

test("Entity Omission is not a default mutation-boundary diagnostic but remains queryable explicitly", () => {
  const defaultMutation = buildMutationGuardrailProfile({ mutationType: "OTHER" });
  assert.equal(defaultMutation.selectedFailureModes.some((x) => x.id === "EntityOmission"), false);
  const explicitMutation = buildMutationGuardrailProfile({ mutationType: "OTHER", failureModes: ["EntityOmission"] });
  assert.equal(explicitMutation.selectedFailureModes[0].id, "EntityOmission");
  assert.match(explicitMutation.boundaries.entityOmission, /reconstruction-stage diagnostic/);
});

test("explicit domain and failure-mode filters are intersected consistently", () => {
  const profile = getReconstructionFailureProfile({ domains: ["SCF"], failureModes: ["MergeFailure", "SemanticFragmentation"] });
  assert.equal(profile.failureModeCount, 1);
  assert.deepEqual(profile.definitions.map((x) => x.id), ["SemanticFragmentation"]);
  assert.deepEqual(profile.unmatchedRequestedFailureModes, ["MergeFailure"]);
});

test("Entity Omission is described with its acquisition/retrieval boundary", () => {
  const profile = getReconstructionFailureProfile({ failureModes: ["EntityOmission"], include: ["definitions", "diagnostic_boundaries"] });
  assert.equal(profile.failureModeCount, 1);
  assert.ok(profile.diagnosticBoundaries.some((x) => x.includes("uncrawled, unindexed, or unretrieved")));
});

test("concept search and relation lookup work by canonical identifier and label", () => {
  assert.equal(searchConcepts("semantic fragmentation")[0].id, "SemanticFragmentation");
  assert.equal(findConcept("https://vocab.danielberanek.cz/dio-odi/#MergeFailure").id, "MergeFailure");
  const relations = getRelations("MergeFailure");
  assert.equal(relations.broader[0].id, "ReferentialReconstructionFailure");
});

test("phase-specific commit contract omits the other phase without undefined fields", () => {
  const phase1 = getCommitBoundaryContract({ phase: "PHASE_1" });
  assert.equal(Object.hasOwn(phase1, "phase2"), false);
  assert.equal(phase1.selectedPhase, "PHASE_1");
});

test("machine-readable MCP contract matches the published tool and resource inventory", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(readFileSync(resolve(here, "../schemas/mcp-contract.json"), "utf8"));
  const expectedTools = [
    "get_mutation_guardrail_profile", "get_reconstruction_failure_profile",
    "get_evidence_promotion_contract", "get_commit_boundary_contract",
    "search_concepts", "get_concept", "get_relations", "get_application_mapping",
    "get_policy_as_code_mapping", "get_reference_status"
  ];
  assert.deepEqual(manifest.tools.map((x) => x.name), expectedTools);
  assert.deepEqual(manifest.resources.sort(), Object.keys(RESOURCE_DOCS).sort());
  assert.ok(manifest.tools.every((x) => x.readOnlyHint === true && x.destructiveHint === false));
  assert.equal(manifest.prompts[0].arguments.temporalScope.$ref, "#/$defs/shortContext");
  assert.equal(manifest.prompts[0].arguments.domainPolicyVersion.maxLength, 120);
  assert.equal(manifest.protocol.version, "2026-07-28");
  assert.equal(manifest.protocol.legacyTransport, "rejected");
});

test("resources are bounded and versioned read-only documents", () => {
  assert.ok(RESOURCE_DOCS["dio-odi://contracts/commit-boundary"]);
  assert.ok(RESOURCE_DOCS["dio-odi://diagnostics/reconstruction-failure-taxonomy"]);
});
