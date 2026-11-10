# Architecture boundaries

## Three separate layers

1. **Canonical Reference Model** — stable concepts, definitions, direct relations, serialization, and provenance.
2. **MCP integration layer** — read-only delivery of the canonical snapshot, diagnostic taxonomy, selected derived mappings, and paper interface contracts.
3. **Agentic ER application** — caller-owned domain policy, evidence stores, admission and promotion validators, MVDIO Supervisor, state/version snapshots, and atomic persistence.

## Boundary from paper v2

The v2 paper's central path is:

`DIO/ODI diagnostic distinctions → domain-governed constraint binding μΩ → configured constraints V_E → mutation-specific propositions q_m → claim-specific evidence eligibility P_auth(q_m, ω) → two-phase authorization → protected commit`.

The MCP server supplies the reference inputs and contract. It does not run `μΩ`, instantiate `V_E`, derive a live `q_m`, inspect `P_active`/`P_quar`/`P_auth`, validate provenance, or enforce the commit invariant.

## Commit semantics retained in the contract

- `READ`: admission to quarantine and a mutation-independent `CheckAdmissionConflict`; possible admission as `UNVERIFIED` does not promote evidence.
- `STAGE_LOCAL`: no shared-state effects.
- `REVERSIBLE_WRITE`: isolated provisional write to `G_shadow`; never publication to production.
- `IRREVERSIBLE_WRITE`: Phase 1 authorization, Phase 2 candidate validation, consistent snapshot, scope check, and version revalidation.
- Outcome precedence: `BREACH` > `UNKNOWN_EVIDENCE` > `PASS`.
- Commit requires `PASS`, valid scope, and valid bound versions.

## Explicit exclusions

- Full dependency-aware evidence lineage and full hypothesis-conditioned feedback-loop control remain future research.
- No universal domain policy is generated from SKOS/RDF.
- No proof of semantic truth, source authenticity, or full provenance reconstruction is claimed.
- No write-capable or authorization-bearing MCP tool is exposed.
