# Example: protected corporate-entity merge

This is an integration illustration, not a working Supervisor or a policy for all legal-entity domains.

## 1. Retrieve the reference profile

An application asks `get_mutation_guardrail_profile` with:

- `actionClass = IRREVERSIBLE_WRITE`
- `mutationType = MERGE`
- its entity class, observation domain, temporal scope, and active domain-policy version

The result points to the relevant RRF, SCF, TRF, and CAF diagnostics and includes the paper's illustrative rule that lexical similarity or a shared commercial neighborhood does not by itself establish co-reference.

## 2. Build application-owned policy inputs

The integrating application supplies its own typed propositions and constraints. For a corporate-compliance context it might distinguish `same_legal_entity`, `renamed_to`, `brand_of`, and `absorbed_by`. Those are application/domain facts and relation types; they are not inferred by the MCP server from labels.

## 3. Run the local Supervisor

Phase 1 locally derives `q_m`, checks claim-specific evidence roles and conflicts, and binds `α_m` to the operation scope, policy version, graph/evidence versions, and per-proposition promotion/validation record identifiers.

Phase 2 validates the isolated candidate graph against a single consistent snapshot. If a required proposition is unsupported, or a material conflict is unresolved, the operation cannot pass. A stale version requires fresh authorization rather than replaying the candidate.

## 4. Commit locally

Only the application can enforce the invariant at its protected write path:

`EvaluateGraphConstraints(...) = PASS ∧ ScopeValid(m, α_m) ∧ VersionsValid(α_m, σ_c)`.

The MCP server has no authority to commit or to assert that this condition is true.
