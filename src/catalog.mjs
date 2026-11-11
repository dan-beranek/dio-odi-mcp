export const REFERENCE_STATUS = {
  referenceModel: {
    name: "DIO/ODI Reference Model",
    archivedVersion: "0.9.0",
    doi: "https://doi.org/10.5281/zenodo.24085589",
    canonicalRepository: "https://github.com/dan-beranek/dio-odi-reference-model",
    liveSite: "https://vocab.danielberanek.cz/"
  },
  referenceVocabulary: {
    version: "0.2.2",
    namespace: "https://vocab.danielberanek.cz/dio-odi/#",
    format: "SKOS/RDF, JSON-LD",
    status: "canonical-reference"
  },
  semanticChangeFeed: {
    liveVersion: "0.1.3",
    schemaVersion: "0.2.1",
    events: 49,
    coverageThrough: "2026-11-11",
    archiveSnapshot: {
      referenceModelVersion: "0.9.0",
      doi: "https://doi.org/10.5281/zenodo.24085589",
      feedVersion: "0.1.1",
      schemaVersion: "0.2.0",
      events: 45,
      coverageThrough: "2026-11-09"
    },
    liveEvents: "https://vocab.danielberanek.cz/semantic-change-feed/events.json",
    schema: "https://vocab.danielberanek.cz/semantic-change-feed/schema.json"
  },
  applicationMappings: {
    agenticEr: {
      version: "0.3.1",
      status: "derived, non-normative",
      localConcepts: 120,
      qualifiedRelationAssertions: 206,
      sourcePaper: "https://arxiv.org/abs/2610.37407v2",
      page: "https://vocab.danielberanek.cz/mappings/agentic-er-architecture/",
      markdown: "https://vocab.danielberanek.cz/mappings/agentic-er-commit-boundary-architecture-mapping.md",
      jsonld: "https://vocab.danielberanek.cz/mappings/agentic-er-commit-boundary-architecture-mapping.jsonld",
      turtle: "https://vocab.danielberanek.cz/mappings/agentic-er-commit-boundary-architecture-mapping.ttl"
    },
    policyAsCode: {
      version: "derived-live",
      lastModified: "2026-11-09",
      status: "derived, non-normative",
      page: "https://vocab.danielberanek.cz/mappings/commit-boundary-policy/",
      markdown: "https://vocab.danielberanek.cz/mappings/commit-boundary-policy-mapping.md",
      jsonld: "https://vocab.danielberanek.cz/mappings/commit-boundary-policy-mapping.jsonld"
    }
  },
  taxonomySource: {
    title: "From Entity Resolution Anomalies to Reconstruction Failure Modes: A Taxonomic Note Following Minimum Viable Digital Identity Optimization (DIO)",
    doi: "https://doi.org/10.5281/zenodo.23269323",
    date: "2026-10-09"
  },
  license: "https://creativecommons.org/licenses/by/4.0/",
  checkedAt: "2026-11-11"
};

const ns = "https://vocab.danielberanek.cz/dio-odi/#";
const C = (id, label, definition = null, extra = {}) => ({ id, uri: ns + id, label, definition, ...extra });

export const CONCEPTS = [
  C("DIO", "Digital Identity Optimization", "An applied discipline concerned with the intentional and systematic optimization of conditions under which an entity's digital identity is reconstructed by relevant human or machine observers.", { altLabels: ["DIO"], related: ["ODI", "MVDIO"] }),
  C("ODI", "Ontology of Digital Identity", "The theoretical meta-layer concerned with digital identity itself and the conditions of its existence, without requiring immediate practical optimization.", { altLabels: ["ODI"], related: ["DIO", "MVDIO"] }),
  C("MVDIO", "Minimum Viable Digital Identity Optimization", "A coarse-grained analytical model identifying the minimum distinctions required for an optimizable problem of digital identity reconstruction to exist.", { altLabels: ["MVDIO"], related: ["DIO", "ODI"] }),
  C("SemanticField", "Semantic Field", "A modeled designation for the shared configuration of mutually conditioned analytical dimensions of digital identity; not a physical field or ontological substance."),
  C("K6", "K6 Semantic Connectome", "A finer-grained candidate model of digital identity comprising six analytically distinguishable dimensions within a single semantic field.", { altLabels: ["Semantic Connectome"] }),
  C("EntityDimension", "Entity"),
  C("RepresentationDimension", "Representation"),
  C("InterpretationDimension", "Interpretation"),
  C("TrustDimension", "Trust", "A context- and task-sensitive evaluative state used as a functional analytical label; it need not imply human psychology in machine observers."),
  C("RelationshipDimension", "Relationship", "A persistent, historically sedimented relation between an observer and an entity that can shape future processing or encounters."),
  C("ReconstructionDimension", "Reconstruction"),
  C("ReferentialContinuity", "Referential Continuity", "Continuity by which an entity can change over time while remaining the same referent for analytical purposes."),
  C("DistributedRepresentationalState", "Distributed Digital Representational State", "The observable distributed digital state through which an entity is represented, including content, attributes, metadata, identifiers, provenance, availability, and relations among representations."),
  C("Observer", "Observer", "A human or machine observer together with the mechanism through which it reads or processes representations."),
  C("ObservationDomain", "Observation Domain", "A bounded set of observational situations against which a specific analysis or optimization is evaluated."),
  C("ReconstructionMechanism", "Reconstruction Mechanism", "A mechanism through which changes in an entity's representational state can alter its reconstruction under sufficiently comparable observation conditions."),
  C("DIOProblem", "DIO Problem", "An inadequacy of reconstruction, continuity, or robustness relative to a legitimate objective within a defined observation domain."),
  C("DIOIntervention", "DIO Intervention", "An intentional and systematic change to the distributed representational state or relations among representations undertaken to address a DIO problem."),
  C("IdentityPreservingConstraint", "Identity-Preserving Constraint", "A condition whose preservation allows differing reconstructions or transformations to remain legitimately anchored to the same referentially continuous entity."),
  C("EssentialVector", "Essential Vector", "The minimal relevant core of identity-preserving constraints; the term does not imply a metaphysical essence or necessarily a numerical vector space."),
  C("IdentityPreservingConstraints", "Identity-Preserving Constraints", "A domain-configured set of conditions evaluated to determine whether differing reconstructions or transformations may legitimately be attributed to the same referentially continuous entity.", { scopeNote: "The applicable set may vary by entity class, operational domain, and observation context; this concept does not specify a universal or context-free constraint inventory." }),
  C("IdentityPreservingVariation", "Identity-Preserving Variation", "Legitimate contextual variation among reconstructions that preserves referential continuity and compatibility rather than requiring uniformity."),
  C("ReconstructionFailureMode", "Reconstruction Failure Mode", "A realized, analytically distinguishable way in which identity reconstruction fails.", { scopeNote: "The taxonomy is non-exclusive and multi-level; a single case may instantiate multiple failure modes.", narrower: ["ReferentialReconstructionFailure", "SemanticCoherenceFailure", "TemporalReconstructionFailure", "ContextualAdequacyFailure"] }),
  C("ReferentialReconstructionFailure", "Referential Reconstruction Failure", "A reconstruction failure concerning the identity assignment of an intended referent.", { broader: "ReconstructionFailureMode", narrower: ["EntitySubstitution", "MergeFailure", "SplitFailure", "EntityOmission"] }),
  C("EntitySubstitution", "Entity Substitution", "A failure in which an intended referent is reconstructed as another distinct referent.", { broader: "ReferentialReconstructionFailure", scopeNote: "This concept does not redefine Identity Collapse and is not asserted to be its canonical form." }),
  C("MergeFailure", "Merge Failure", "A failure in which two or more distinct referents are reconstructed as a single referential identity.", { broader: "ReferentialReconstructionFailure" }),
  C("SplitFailure", "Split Failure", "A failure in which one referentially continuous entity is reconstructed as two or more distinct referential identities.", { broader: "ReferentialReconstructionFailure" }),
  C("EntityOmission", "Entity Omission", "A failure in which sufficient representational grounds are available to an observer within the relevant observation domain, yet no relevant reconstruction of the entity is produced.", { broader: "ReferentialReconstructionFailure", scopeNote: "Does not include cases where relevant representations were unavailable, unacquired, uncrawled, unindexed, or unretrieved." }),
  C("SemanticCoherenceFailure", "Semantic Coherence Failure", null, { broader: "ReconstructionFailureMode", narrower: ["SemanticFragmentation"] }),
  C("SemanticFragmentation", "Semantic Fragmentation", "Loss of identity-preserving coherence among distributed reconstructions of the same referentially continuous entity while referential unity may remain preserved.", { broader: "SemanticCoherenceFailure" }),
  C("TemporalReconstructionFailure", "Temporal Reconstruction Failure", null, { broader: "ReconstructionFailureMode", narrower: ["TemporalDiscontinuity", "TemporalMisalignment"] }),
  C("TemporalDiscontinuity", "Temporal Discontinuity", "Failure to preserve referential continuity across legitimate transformations of the same entity over time.", { broader: "TemporalReconstructionFailure" }),
  C("TemporalMisalignment", "Temporal Misalignment", "A failure in which the correct referent is identified but the reconstructed state is temporally inappropriate to the observational situation.", { broader: "TemporalReconstructionFailure" }),
  C("ContextualAdequacyFailure", "Contextual Adequacy Failure", null, { broader: "ReconstructionFailureMode", narrower: ["ContextualDisplacement"] }),
  C("ContextualDisplacement", "Contextual Displacement", "A failure in which a factually supportable reconstruction is inadequate to the relevant observational context because another legitimate aspect of identity displaces the aspect currently relevant.", { broader: "ContextualAdequacyFailure" }),
  C("IdentityCollapse", "Identity Collapse", "A phenomenon-level concept concerning impairment of the identity function of a particular entity, retained in the sense established in The Crisis of Entity Resolution in Heterogeneous AI Environments.", { scopeNote: "Not classified as a branch of the current Reconstruction Failure Mode hierarchy. The vocabulary does not assert whether individual failure modes cause, constitute, exhaust, or are required for Identity Collapse." }),
  C("SemanticVulnerability", "Semantic Vulnerability", "A robustness-related property describing susceptibility of identity reconstruction to destabilization or disproportionate change under perturbations of the representational environment.", { scopeNote: "Not a Reconstruction Failure Mode." }),
  C("SemanticRobustness", "Semantic Robustness", "The conceptual counterpart of Semantic Vulnerability: robustness of identity reconstruction under perturbations of the representational environment."),
  C("ReconstructionCapture", "Reconstruction Capture", "A concept used for cases in which a small subset of representations has disproportionate influence over the resulting reconstruction.", { scopeNote: "Included because it is present in MVDIO; v0.1 does not further formalize its relationship to Semantic Vulnerability." }),
  C("EntityResolutionAnomaly", "Entity Resolution Anomaly")
];

export const FAILURE_DOMAINS = [
  { id: "RRF", label: "Referential Reconstruction Failures", uri: ns + "ReferentialReconstructionFailure", description: "Failures concerning the identity assignment of an intended referent.", failureModes: ["EntitySubstitution", "MergeFailure", "SplitFailure", "EntityOmission"] },
  { id: "SCF", label: "Semantic Coherence Failures", uri: ns + "SemanticCoherenceFailure", description: "Failures of identity-preserving coherence among distributed reconstructions; referential unity may remain preserved.", failureModes: ["SemanticFragmentation"] },
  { id: "TRF", label: "Temporal Reconstruction Failures", uri: ns + "TemporalReconstructionFailure", description: "Failures concerning referential continuity or temporal state attribution across time.", failureModes: ["TemporalDiscontinuity", "TemporalMisalignment"] },
  { id: "CAF", label: "Contextual Adequacy Failures", uri: ns + "ContextualAdequacyFailure", description: "Failures where a factually supportable reconstruction is inadequate for the relevant observation context.", failureModes: ["ContextualDisplacement"] }
];

export const CONSTRAINT_BINDINGS = [
  {
    id: "rf-identity-not-relatedness",
    failureModes: ["EntitySubstitution", "MergeFailure"],
    domains: ["RRF"],
    mutationTypes: ["MERGE", "UNMERGE"],
    diagnosticDistinction: "Entity Substitution / Merge Failure (RRF)",
    constraintPattern: "Lexical similarity or a shared commercial neighborhood does not by itself establish that two records denote the same referent.",
    authorizationConsequence: "Do not merge without claim-specific evidence establishing co-reference.",
    epistemicStatus: "illustrative",
    sourceSection: "Constraining the Commit Boundary v2, §5.2"
  },
  {
    id: "temporal-continuity-interval",
    failureModes: ["TemporalDiscontinuity", "TemporalMisalignment"],
    domains: ["TRF"],
    mutationTypes: ["MERGE", "SPLIT", "UNMERGE", "OTHER"],
    diagnosticDistinction: "Temporal Discontinuity / Temporal Misalignment (TRF)",
    constraintPattern: "A rename or continuity claim must apply to the relevant referent and validity interval.",
    authorizationConsequence: "Defer if temporal applicability or legal continuity is unresolved.",
    epistemicStatus: "illustrative",
    sourceSection: "Constraining the Commit Boundary v2, §5.2"
  },
  {
    id: "semantic-identity-conflict",
    failureModes: ["SemanticFragmentation"],
    domains: ["SCF"],
    mutationTypes: ["MERGE", "SPLIT", "UNMERGE", "OTHER"],
    diagnosticDistinction: "Semantic Fragmentation (SCF)",
    constraintPattern: "Materially incompatible claims affecting identity are retained as a conflict until reconciled; clustering alone does not reconcile them.",
    authorizationConsequence: "Require reconciliation or defer the affected mutation. This illustrative binding covers the identity-affecting subset; other attribute-level incompatibilities remain governed by domain policy.",
    epistemicStatus: "illustrative",
    sourceSection: "Constraining the Commit Boundary v2, §5.2"
  },
  {
    id: "context-preserve-relation-type",
    failureModes: ["ContextualDisplacement"],
    domains: ["CAF"],
    mutationTypes: ["MERGE", "SPLIT", "UNMERGE", "OTHER"],
    diagnosticDistinction: "Contextual Displacement (CAF)",
    constraintPattern: "The same brand_of relation may be adequate in a brand catalogue but insufficient for the legal-entity identity proposition required in a compliance context.",
    authorizationConsequence: "Preserve the typed relation; require evidence and constraints appropriate to the current observation purpose.",
    epistemicStatus: "illustrative",
    sourceSection: "Constraining the Commit Boundary v2, §5.2"
  },
  {
    id: "referential-continuity-for-resolution",
    failureModes: ["SplitFailure", "TemporalDiscontinuity"],
    domains: ["RRF", "TRF"],
    mutationTypes: ["MERGE", "UNMERGE"],
    diagnosticDistinction: "Split Failure / valid continuity (RRF/TRF)",
    constraintPattern: "Documented, temporally applicable evidence may establish that distinct records refer to one continuing entity.",
    authorizationConsequence: "Permit resolution when the claim-specific evidence and all applicable constraints pass.",
    epistemicStatus: "illustrative",
    sourceSection: "Constraining the Commit Boundary v2, §5.2"
  }
];

export const EVIDENCE_PROMOTION_CONTRACT = {
  admission: {
    firstState: "QUARANTINE_EVIDENCE",
    check: "CheckAdmissionConflict(observation, P_active, P_quar)",
    outcomes: ["CONFLICT", "NO_CONFLICT_DETECTED", "INDETERMINATE"],
    behavior: {
      CONFLICT: "Keep the observation quarantined for policy-designated adjudication.",
      INDETERMINATE: "Keep the observation quarantined; a plausible material conflict cannot be resolved on the available basis.",
      NO_CONFLICT_DETECTED: "May admit to P_active as UNVERIFIED after a version-checked atomic update; this is not positive evidence of identity."
    },
    mutationIndependent: true
  },
  states: {
    P_quar: "Quarantined evidence outside the Planner-visible active set.",
    P_active: "Planner-visible active evidence, which may contain UNVERIFIED items.",
    P_auth: "Claim- and context-specific eligibility subset P_auth(q_m, ω) ⊆ P_active; eligibility is not a universal truth label."
  },
  evidentiaryRoles: ["SUPPORT", "CONTRADICTION", "UNRESOLVED_INDICATION"],
  claimConflictCheck: {
    function: "CheckClaimConflict(q_m, P_auth, P_active, P_quar)",
    outcomes: ["CLEAR", "CONFLICT", "INDETERMINATE"],
    meaning: {
      CLEAR: "No unresolved material conflict bearing on q_m is detected.",
      CONFLICT: "Claim-specific authorization-eligible evidence establishes a relevant contradiction or prohibitive condition.",
      INDETERMINATE: "A possible material conflict is indicated only by UNVERIFIED/quarantined evidence or conflicting eligible items cannot be reconciled under policy."
    }
  },
  promotionRequirements: [
    "Assess the specific proposition required for the candidate mutation, not document relevance, query match, or plausibility alone.",
    "Record source/provenance basis, proposition, evidentiary role, temporal applicability where relevant, validation basis, and policy/validator version.",
    "Do not use Planner confidence, an LLM-generated verified label, or repetition across UNVERIFIED observations as sufficient authorization evidence.",
    "Do not promote solely because the Planner hypothesis induced the retrieval query. Recorded shared upstream origins must not be counted as independent corroboration merely because they appear as separate items.",
    "Do not infer positive support from the absence of a detected conflict.",
    "Exclude shadow candidates and recorded claim bases that transitively cite shadow content from positive promotion.",
    "Grant eligibility only for the proposition, evidentiary role, and applicability established under the declared policy."
  ],
  criticalBoundary: "The contract operates on recorded provenance. It does not reconstruct every unrecorded causal dependency in the full hypothesis-conditioned Plan–Act–Observe–Update loop."
};

export const COMMIT_BOUNDARY_CONTRACT = {
  architecture: "DIO/ODI diagnostic distinctions → domain-governed constraint binding μΩ → configured constraints V_E → mutation-specific required propositions q_m → claim-specific evidence eligibility P_auth(q_m, ω) → two-phase authorization → protected commit.",
  actionClasses: {
    READ: "Returned material is placed in QUARANTINE_EVIDENCE, admission-checked, and may be admitted to P_active as UNVERIFIED. READ does not itself promote evidence or authorize an identity mutation.",
    STAGE_LOCAL: "Must produce no shared-state effects. Confirm local isolation before accepting the result.",
    REVERSIBLE_WRITE: "May stage only to an isolated G_shadow. It must remain isolated from production, Planner-visible shared identity state, downstream consumers, and P_auth inputs. It never authorizes publication to production.",
    IRREVERSIBLE_WRITE: "Protected identity-changing write. Requires Phase 1 pre-execution authorization and Phase 2 post-execution validation before commit. Ambiguous effect class is treated as protected."
  },
  phase1: [
    "Verify action class, target, and declared effect scope.",
    "Derive q_m := DeriveRequiredClaims(m, V_E, v_pol) from the proposed mutation, target/effect scope, configured constraints, and versioned policy; the Planner cannot weaken or replace q_m.",
    "Evaluate every required proposition using claim-specific P_auth(q_m, ω); record support/validation record IDs per proposition.",
    "Check claim-specific conflicts across P_auth, P_active, and P_quar.",
    "Issue α_m only when action constraints pass; bind q_m, operation/effect scope, relevant versions, and per-proposition promotion/validation record identifiers."
  ],
  phase2: [
    "Check the realized operation exactly matches the authorized action/effect scope.",
    "Obtain one consistent snapshot σ_c of relevant graph, active/quarantined evidence, eligibility state, policy, optional shadow state, and versions.",
    "Reject stale authorization; re-evaluate from Phase 1 with a new record rather than replaying a stale candidate.",
    "Apply protected writes to isolated candidate G_cand; re-derive q_m and require consistency with α_m.",
    "Evaluate graph constraints and evidence-to-claim support under the same snapshot; this is not merely graph-shape validation.",
    "Commit only when status is PASS, scope is valid, and bound versions remain valid."
  ],
  statuses: {
    PASS: "Every required positive condition is supported by claim-specific authorization-eligible evidence; no applicable prohibition is established; CheckClaimConflict returns CLEAR.",
    BREACH: "Authorization-eligible evidence establishes a relevant contradiction or violation of an explicit prohibitive constraint.",
    UNKNOWN_EVIDENCE: "Required positive support is insufficient or a material conflict remains unresolved/indeterminate. This blocks commit; it does not prove the identity claim false."
  },
  precedence: ["BREACH", "UNKNOWN_EVIDENCE", "PASS"],
  commitInvariant: "Commit(m) ⇒ EvaluateGraphConstraints(...)=PASS ∧ ScopeValid(m, α_m) ∧ VersionsValid(α_m, σ_c)",
  boundVersions: ["v_G (graph)", "v_E (active/quarantined evidence and authorization eligibility)", "v_pol (policy)", "v_S (shadow state, when used)"],
  retry: "One common retry budget spans retry triggers in both lifecycle phases. A stale candidate is not replayed; re-evaluate against a fresh snapshot with a new authorization record.",
  conditionalAssumptions: [
    "Domain-policy adequacy.",
    "Claim-specific promotion correctness.",
    "Fail-closed outcome handling.",
    "Enforced and conservative mutation classification; all relevant production write paths pass through the Supervisor.",
    "Supervisor-derived authorization propositions that the Planner cannot weaken.",
    "Scope and version integrity at the protected boundary.",
    "Recorded-basis and eligibility integrity; unrecorded derivations remain outside the guarantee."
  ],
  limitation: "Conceptual architecture and interface specification, not an implemented Supervisor, formal proof, or empirical validation. The commit property is conditional on the stated assumptions."
};

export const POLICY_AS_CODE_OBLIGATIONS = [
  ["Explicit mutation and operational scope", "OPA structured input and Cedar principal/action/resource/context can represent a proposed operation; identity-changing scope must still be defined by the integrating application."],
  ["Claim-specific evidence support", "Structured input and policy rules can inspect declared claim and evidence metadata, but evidence authenticity, provenance, and eligibility require trusted integration."],
  ["Identity-preserving constraints", "Policy predicates can evaluate supplied candidate-state attributes against configured constraints; they do not generate the domain identity model or validate unprovided facts."],
  ["Violation versus unknown evidence", "OPA can return structured application-defined states. Cedar returns Allow or Deny with diagnostics; DIO/ODI multi-state semantics require explicit modeling and integration."],
  ["Observation context and temporal validity", "Temporal and contextual inputs can be represented in policy data, but their meaning and validity need domain modeling."],
  ["Policy revision freshness", "OPA decision logs can include bundle revision; integration must still ensure the applicable revision remains valid at commit time."],
  ["Graph state freshness", "Expected state versions may be supplied to the engine, but a transaction or compare-and-swap check is required at the protected write boundary."],
  ["Enforcement at all protected write paths", "OPA separates decision-making from enforcement; Cedar returns decisions to the calling application. Integration must prevent bypass of the protected write path."],
  ["Evidence-to-commit audit trail", "OPA decision logs and Cedar diagnostics can contribute to auditability, but the complete evidence, version, and commit record requires application-level integration."],
  ["Unknown, timeout, and evaluation-error handling", "Non-success and unknown states need explicit fail-closed or deferral behavior; absence of a valid decision must not authorize a persistent mutation."],
  ["Authorization does not prove semantic truth", "Allow or PASS describes conformance to encoded policy and supplied inputs; it does not independently establish that the reconstructed identity relation is true."]
].map(([name, description], index) => ({ id: index + 1, name, description, mappingStatus: "derived-integration-requirement" }));

export const RESOURCE_DOCS = {
  "dio-odi://reference/status": { name: "DIO/ODI reference status", mimeType: "application/json", content: REFERENCE_STATUS },
  "dio-odi://reference/vocabulary": { name: "DIO/ODI concept index", mimeType: "application/json", content: { namespace: ns, version: REFERENCE_STATUS.referenceVocabulary.version, concepts: CONCEPTS } },
  "dio-odi://diagnostics/reconstruction-failure-taxonomy": { name: "Reconstruction Failure taxonomy", mimeType: "application/json", content: { domains: FAILURE_DOMAINS, failureModes: CONCEPTS.filter(x => ["EntitySubstitution", "MergeFailure", "SplitFailure", "EntityOmission", "SemanticFragmentation", "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"].includes(x.id)), nonExclusive: true, identityCollapse: "Phenomenon-level concept, not a fifth branch.", semanticVulnerability: "Robustness-related property, not a realized failure mode." } },
  "dio-odi://contracts/evidence-promotion": { name: "Evidence admission and promotion contract", mimeType: "application/json", content: EVIDENCE_PROMOTION_CONTRACT },
  "dio-odi://contracts/commit-boundary": { name: "Commit-boundary contract", mimeType: "application/json", content: COMMIT_BOUNDARY_CONTRACT },
  "dio-odi://mappings/agentic-er": { name: "Agentic ER architecture mapping", mimeType: "application/json", content: { ...REFERENCE_STATUS.applicationMappings.agenticEr, centralPath: REFERENCE_STATUS.applicationMappings.agenticEr.status + ": " + COMMIT_BOUNDARY_CONTRACT.architecture, localConcepts: 120, qualifiedRelationAssertions: 206, sections: ["diagnostic foundation", "constraint binding", "mutation and proposition binding", "evidence admission and claim-specific eligibility", "two-phase authorization and commit", "assumptions", "evaluation protocol", "future-research boundary"] } },
  "dio-odi://mappings/policy-as-code": { name: "Policy-as-Code mapping", mimeType: "application/json", content: { ...REFERENCE_STATUS.applicationMappings.policyAsCode, obligations: POLICY_AS_CODE_OBLIGATIONS } }
};
