# MCP API contract — v0.1.0

Protocol: MCP TypeScript SDK v2, MCP revision `2026-07-28`, Streamable HTTP, endpoint `/mcp`. The server rejects legacy protocol negotiation. The server is stateless and read-only. Inputs are validated by Zod and bounded in size. Tool results provide both JSON text content and `structuredContent`.

## Main tool: `get_mutation_guardrail_profile`

### Input

```json
{
  "actionClass": "IRREVERSIBLE_WRITE",
  "mutationType": "MERGE",
  "entityClass": "legal-entity",
  "observationDomain": "corporate-compliance",
  "temporalScope": "2020-01-01/2026-11-10",
  "domainPolicyVersion": "policy-2026-11",
  "failureModes": ["EntitySubstitution", "MergeFailure", "TemporalMisalignment"],
  "include": ["evidence_requirements", "commit_checks"]
}
```

| Field | Type | Required | Contract |
|---|---|---:|---|
| `actionClass` | enum | no | `READ`, `STAGE_LOCAL`, `REVERSIBLE_WRITE`, `IRREVERSIBLE_WRITE`; default `IRREVERSIBLE_WRITE` |
| `mutationType` | enum | no | `MERGE`, `SPLIT`, `UNMERGE`, `OTHER`; default `MERGE` |
| `entityClass` | string ≤160 | no | Caller-supplied domain context; echoed, not interpreted |
| `observationDomain` | string ≤160 | no | Caller-supplied observer/purpose context; echoed, not interpreted |
| `temporalScope` | string ≤160 | no | Caller-supplied interval/epoch; echoed, not interpreted |
| `domainPolicyVersion` | string ≤120 | no | Caller-supplied policy version; echoed, not validated |
| `failureModes` | array of canonical IDs, max 8 | no | Restricts the diagnostic selection |
| `include` | array | no | Optional large blocks: `evidence_requirements`, `commit_checks`; diagnostic mappings are always returned |

### Output envelope

```json
{
  "profile": "DIO/ODI mutation guardrail reference profile",
  "profileVersion": "0.1.0",
  "actionClass": "IRREVERSIBLE_WRITE",
  "mutationType": "MERGE",
  "context": {
    "entityClass": "legal-entity",
    "observationDomain": "corporate-compliance",
    "temporalScope": "2020-01-01/2026-11-10",
    "domainPolicyVersion": "policy-2026-11",
    "interpretation": "Caller-supplied context; not verified or used to generate policy."
  },
  "selectedDiagnosticDomains": [],
  "selectedFailureModes": [],
  "diagnosticToConstraintMappings": [],
  "requiredDomainInputs": [],
  "notSuppliedContextFields": [],
  "contextFieldApplicability": "Not all supplied context fields are mandatory for every operation; applicability is determined by the integrating policy.",
  "actionContract": {},
  "evidencePromotionContract": {},
  "commitBoundaryContract": {},
  "decisionBoundary": "Reference profile only; not authorization or a commit verdict."
}
```

The above is an output shape illustration. The actual response includes the selected objects and source links for the requested profile. `Entity Omission` is part of the full taxonomy but is excluded from default mutation profiles because its diagnostic condition belongs to the reconstruction stage rather than automatically to the commit boundary; callers may request it explicitly and receive its stage boundary.

## Other tools

### `get_reconstruction_failure_profile`

Inputs: optional `domains` (`RRF|SCF|TRF|CAF`), optional `failureModes` (the eight canonical IDs), and `include` (`definitions`, `diagnostic_boundaries`, `constraint_mappings`, `source_provenance`). Defaults to all four domains and all eight failure modes.

### `get_evidence_promotion_contract`

No inputs. Returns admission outcomes, evidence stores/eligibility distinction, evidentiary roles, claim-specific conflict outcomes and seven promotion requirements.

### `get_commit_boundary_contract`

Optional `phase` (`PHASE_1|PHASE_2`) and `actionClass` (`READ|STAGE_LOCAL|REVERSIBLE_WRITE|IRREVERSIBLE_WRITE`). Returns the selected part of the abstract interface contract.

### `search_concepts`

`query` is a non-empty string up to 180 characters; `limit` is an integer from 1 to 30 (default 10). Searches the bundled 40-concept Vocabulary v0.2.2 index.

### `get_concept`

`identifier` is a concept ID, canonical URI, preferred label or alternate label, up to 240 characters.

### `get_relations`

`identifier` as above. Returns only direct broader/narrower/related vocabulary relations. This is not a SPARQL endpoint.

### `get_application_mapping`

`mapping` is `agentic-er|policy-as-code`; `section` is `all|overview|diagnostic-to-constraint|evidence|authorization|boundary`. Returns a curated section extract and full source links; it does not return all 206 qualified assertions in one response.

### `get_policy_as_code_mapping`

No inputs. Returns the 11 OPA/Rego and Cedar integration obligations and limitations.

### `get_reference_status`

No inputs. Returns current archive, Vocabulary, mapping, and live SCF metadata.

## Epistemic-status contract

- `canonical-reference`: definition and identifier reused from the canonical Reference Vocabulary;
- `specified`: requirement explicitly stated in the current conceptual architecture/interface specification;
- `assumed`: requirement needed for the conditional property but not independently guaranteed by the Supervisor;
- `illustrative`: paper example, not a universal policy or executable rule;
- `proposed-evaluation`: future evaluation element, not an empirical result;
- `future-research`: outside the current architecture.

The main tool never promotes an `illustrative` mapping into a normative rule. Fields in `notSuppliedContextFields` are not blanket validation failures: the integrating application's versioned domain policy determines which are required for the selected operation.
