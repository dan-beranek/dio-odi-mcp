import {
  CONCEPTS,
  CONSTRAINT_BINDINGS,
  FAILURE_DOMAINS,
  EVIDENCE_PROMOTION_CONTRACT,
  COMMIT_BOUNDARY_CONTRACT,
  POLICY_AS_CODE_OBLIGATIONS,
  REFERENCE_STATUS
} from "./catalog.mjs";

const ALL_FAILURE_MODE_IDS = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "EntityOmission",
  "SemanticFragmentation", "TemporalDiscontinuity", "TemporalMisalignment",
  "ContextualDisplacement"
];

const MERGE_MODES = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "SemanticFragmentation",
  "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"
];
const SPLIT_MODES = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "SemanticFragmentation",
  "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"
];
const UNMERGE_MODES = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "SemanticFragmentation",
  "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"
];
const MUTATION_PROFILE_MODE_IDS = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "SemanticFragmentation",
  "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"
];

export function findConcept(identifier) {
  if (!identifier) return null;
  const needle = String(identifier).trim().toLowerCase();
  return CONCEPTS.find((c) =>
    c.id.toLowerCase() === needle ||
    c.uri.toLowerCase() === needle ||
    c.uri.toLowerCase().endsWith(`#${needle.replace(/^dio-odi:/, "")}`) ||
    c.label.toLowerCase() === needle ||
    (c.altLabels ?? []).some((a) => a.toLowerCase() === needle)
  ) ?? null;
}

export function searchConcepts(query, limit = 10) {
  const terms = String(query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const rows = CONCEPTS.map((concept) => {
    const haystack = [concept.id, concept.label, concept.definition ?? "", concept.scopeNote ?? "", ...(concept.altLabels ?? [])].join(" ").toLowerCase();
    const hits = terms.filter((term) => haystack.includes(term)).length;
    const exact = concept.label.toLowerCase() === terms.join(" ") || concept.id.toLowerCase() === terms.join("");
    return { concept, score: hits + (exact ? 5 : 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.concept.label.localeCompare(b.concept.label));
  return rows.slice(0, Math.max(1, Math.min(limit, 30))).map((x) => ({ ...x.concept, matchScore: x.score }));
}

export function getRelations(identifier) {
  const concept = findConcept(identifier);
  if (!concept) return null;
  const broader = concept.broader ? findConcept(concept.broader) : null;
  const narrower = (concept.narrower ?? []).map(findConcept).filter(Boolean);
  const related = (concept.related ?? []).map(findConcept).filter(Boolean);
  return {
    concept: { id: concept.id, uri: concept.uri, label: concept.label },
    broader: broader ? [{ id: broader.id, uri: broader.uri, label: broader.label }] : [],
    narrower: narrower.map((x) => ({ id: x.id, uri: x.uri, label: x.label })),
    related: related.map((x) => ({ id: x.id, uri: x.uri, label: x.label }))
  };
}

export function getReconstructionFailureProfile({ domains, failureModes, include = ["definitions", "diagnostic_boundaries", "constraint_mappings", "source_provenance"] } = {}) {
  const chosenDomains = domains?.length ? FAILURE_DOMAINS.filter((d) => domains.includes(d.id)) : FAILURE_DOMAINS;
  const domainModeIds = chosenDomains.flatMap((d) => d.failureModes);
  const requestedModeIds = failureModes?.length ? failureModes : domainModeIds;
  const allowedIds = requestedModeIds.filter((id) => domainModeIds.includes(id));
  const chosenModes = CONCEPTS.filter((c) => allowedIds.includes(c.id) && ALL_FAILURE_MODE_IDS.includes(c.id));
  const unmatchedRequestedFailureModes = requestedModeIds.filter((id) => !domainModeIds.includes(id));
  const domainRecords = chosenDomains.map((d) => ({
    ...d,
    failureModes: chosenModes.filter((m) => d.failureModes.includes(m.id)).map((m) => ({ id: m.id, uri: m.uri, label: m.label, definition: m.definition, scopeNote: m.scopeNote ?? null }))
  }));
  const result = {
    taxonomy: "DIO/ODI Reconstruction Failure Modes",
    taxonomyType: "non-exclusive, multi-level diagnostic taxonomy",
    selectedDomains: domainRecords,
    failureModeCount: chosenModes.length,
    unmatchedRequestedFailureModes,
    caseMayInstantiateMultipleModes: true,
    identityCollapse: {
      status: "phenomenon-level; not a fifth branch",
      uri: findConcept("IdentityCollapse").uri,
      note: "The taxonomy does not assert that particular failure modes cause, constitute, exhaust, or are required for Identity Collapse."
    },
    semanticVulnerability: {
      status: "robustness-related property; not a realized failure mode",
      uri: findConcept("SemanticVulnerability").uri,
      counterpart: findConcept("SemanticRobustness").uri
    }
  };
  if (include.includes("definitions")) result.definitions = chosenModes.map((m) => ({ id: m.id, uri: m.uri, label: m.label, definition: m.definition, scopeNote: m.scopeNote ?? null }));
  if (include.includes("diagnostic_boundaries")) {
    result.diagnosticBoundaries = [
      "Entity Substitution: one intended referent is reconstructed as a different referent.",
      "Merge Failure: two or more distinct referents are reconstructed as one identity.",
      "Split Failure: one referentially continuous entity is reconstructed as multiple identities.",
      "Entity Omission: sufficient representational grounds exist in the observation domain but no reconstruction is produced; unavailable, uncrawled, unindexed, or unretrieved material is not Entity Omission.",
      "Semantic Fragmentation preserves referential unity while losing identity-preserving semantic coherence; Split Failure loses referential unity itself.",
      "Temporal Discontinuity loses continuity across legitimate transformations; Temporal Misalignment identifies the right referent in the wrong temporal state.",
      "Contextual Displacement can occur even when the reconstruction is factually supportable; it is inadequate for the relevant observation context."
    ];
  }
  if (include.includes("constraint_mappings")) result.constraintMappings = CONSTRAINT_BINDINGS.filter((b) => b.failureModes.some((id) => allowedIds.includes(id)));
  if (include.includes("source_provenance")) result.sources = [
    { title: "From Entity Resolution Anomalies to Reconstruction Failure Modes", doi: REFERENCE_STATUS.taxonomySource.doi, date: REFERENCE_STATUS.taxonomySource.date },
    { title: "Constraining the Commit Boundary (v2)", url: REFERENCE_STATUS.applicationMappings.agenticEr.sourcePaper, sections: ["§2", "§5.2"] },
    { title: "DIO/ODI Reference Vocabulary", url: "https://vocab.danielberanek.cz/dio-odi/", version: REFERENCE_STATUS.referenceVocabulary.version }
  ];
  return result;
}

export function buildMutationGuardrailProfile(input = {}) {
  const actionClass = input.actionClass ?? "IRREVERSIBLE_WRITE";
  const mutationType = input.mutationType ?? "MERGE";
  const modeDefaults = mutationType === "MERGE" ? MERGE_MODES : mutationType === "SPLIT" ? SPLIT_MODES : mutationType === "UNMERGE" ? UNMERGE_MODES : MUTATION_PROFILE_MODE_IDS;
  const selectedModeIds = input.failureModes?.length ? input.failureModes : modeDefaults;
  const selectedModes = CONCEPTS.filter((c) => selectedModeIds.includes(c.id) && ALL_FAILURE_MODE_IDS.includes(c.id));
  const selectedDomains = FAILURE_DOMAINS.filter((d) => d.failureModes.some((id) => selectedModeIds.includes(id)));
  const bindings = CONSTRAINT_BINDINGS.filter((b) =>
    b.failureModes.some((id) => selectedModeIds.includes(id)) &&
    (b.mutationTypes.includes(mutationType) || mutationType === "OTHER")
  );
  const missingContext = [
    ["entityClass", input.entityClass],
    ["observationDomain", input.observationDomain],
    ["temporalScope", input.temporalScope],
    ["domainPolicyVersion", input.domainPolicyVersion]
  ].filter(([, value]) => !value).map(([name]) => name);

  const result = {
    profile: "DIO/ODI mutation guardrail reference profile",
    profileVersion: "0.1.0",
    actionClass,
    mutationType,
    context: {
      entityClass: input.entityClass ?? null,
      observationDomain: input.observationDomain ?? null,
      temporalScope: input.temporalScope ?? null,
      domainPolicyVersion: input.domainPolicyVersion ?? null,
      interpretation: "These fields are caller-supplied context. The MCP server echoes them; it does not infer, verify, or instantiate a domain policy from them."
    },
    selectedDiagnosticDomains: selectedDomains,
    selectedFailureModes: selectedModes.map((m) => ({ id: m.id, uri: m.uri, label: m.label, definition: m.definition })),
    diagnosticToConstraintMappings: bindings,
    requiredDomainInputs: [
      "Entity class and protected mutation class.",
      "Observation domain: observer/consumer, operational purpose, and relevant context.",
      "Temporal epoch or validity interval where a continuity/state claim requires it.",
      "Versioned domain policy that specifies typed propositions and identity-preserving constraints.",
      "A trusted evidence-admission and claim-specific promotion process, including recorded provenance and validator version."
    ],
    notSuppliedContextFields: missingContext,
    contextFieldApplicability: "These caller-supplied fields were not provided. They are not all mandatory for every operation; the integrating application determines applicability from its versioned domain policy.",
    boundaries: {
      entityOmission: "Entity Omission is a reconstruction-stage diagnostic, not automatically a commit-boundary condition. It qualifies only when sufficient representational grounds were available within the observation domain; acquisition, crawl, index, or retrieval absence belongs to a different failure stage.",
      identityCollapse: "Identity Collapse remains a phenomenon-level concept, not a fifth diagnostic branch.",
      semanticVulnerability: "Semantic Vulnerability is a robustness-related property, not a realized Reconstruction Failure Mode.",
      nonExclusive: "Failure modes are non-exclusive; one case may involve several diagnostic domains."
    },
    epistemicStatus: {
      canonicalDefinitions: "canonical-reference",
      diagnosticToConstraintExamples: "illustrative",
      executablePolicy: "not-provided-by-reference-model"
    },
    referenceVersions: {
      referenceModel: {
        version: REFERENCE_STATUS.referenceModel.archivedVersion,
        doi: REFERENCE_STATUS.referenceModel.doi
      },
      referenceVocabulary: {
        version: REFERENCE_STATUS.referenceVocabulary.version,
        namespace: REFERENCE_STATUS.referenceVocabulary.namespace
      },
      agenticErMapping: {
        version: REFERENCE_STATUS.applicationMappings.agenticEr.version,
        status: REFERENCE_STATUS.applicationMappings.agenticEr.status
      },
      taxonomy: {
        doi: REFERENCE_STATUS.taxonomySource.doi,
        date: REFERENCE_STATUS.taxonomySource.date
      },
      policyAsCodeMapping: {
        lastModified: REFERENCE_STATUS.applicationMappings.policyAsCode.lastModified,
        status: REFERENCE_STATUS.applicationMappings.policyAsCode.status
      }
    },
    sources: [
      REFERENCE_STATUS.applicationMappings.agenticEr.sourcePaper,
      REFERENCE_STATUS.applicationMappings.agenticEr.page,
      REFERENCE_STATUS.taxonomySource.doi
    ],
    decisionBoundary: "This is a reference profile, not a policy decision, not an authorization record α_m, and not a PASS/BREACH/UNKNOWN_EVIDENCE verdict."
  };

  if (actionClass === "READ") {
    result.actionContract = {
      description: COMMIT_BOUNDARY_CONTRACT.actionClasses.READ,
      admissionCheck: EVIDENCE_PROMOTION_CONTRACT.admission.check,
      admissionOutcomes: EVIDENCE_PROMOTION_CONTRACT.admission.outcomes,
      prohibits: ["Do not promote as part of admission.", "Do not treat NO_CONFLICT_DETECTED as positive identity evidence."]
    };
  } else if (actionClass === "STAGE_LOCAL") {
    result.actionContract = {
      description: COMMIT_BOUNDARY_CONTRACT.actionClasses.STAGE_LOCAL,
      requiredChecks: ["Confirm no production graph effect.", "Confirm no Planner-visible shared identity state change.", "Discard and escalate if any shared-state effect occurred."]
    };
  } else if (actionClass === "REVERSIBLE_WRITE") {
    result.actionContract = {
      description: COMMIT_BOUNDARY_CONTRACT.actionClasses.REVERSIBLE_WRITE,
      requiredChecks: ["Stage only in isolated G_shadow.", "Verify isolation from production, Planner-visible shared identity state, downstream consumers, and P_auth inputs.", "Bind and revalidate v_S, v_pol, and other staging-relevant versions.", "Never publish to production under this authorization."]
    };
  } else {
    result.actionContract = {
      description: COMMIT_BOUNDARY_CONTRACT.actionClasses.IRREVERSIBLE_WRITE,
      phase1: COMMIT_BOUNDARY_CONTRACT.phase1,
      phase2: COMMIT_BOUNDARY_CONTRACT.phase2,
      commitInvariant: COMMIT_BOUNDARY_CONTRACT.commitInvariant,
      requiredVersionBindings: COMMIT_BOUNDARY_CONTRACT.boundVersions,
      statusPrecedence: COMMIT_BOUNDARY_CONTRACT.precedence,
      conditionalAssumptions: COMMIT_BOUNDARY_CONTRACT.conditionalAssumptions
    };
  }

  if (input.include?.includes("evidence_requirements") || !input.include) result.evidencePromotionContract = EVIDENCE_PROMOTION_CONTRACT;
  if (input.include?.includes("commit_checks") || !input.include) result.commitBoundaryContract = {
    phase1: COMMIT_BOUNDARY_CONTRACT.phase1,
    phase2: COMMIT_BOUNDARY_CONTRACT.phase2,
    statuses: COMMIT_BOUNDARY_CONTRACT.statuses,
    precedence: COMMIT_BOUNDARY_CONTRACT.precedence,
    limitation: COMMIT_BOUNDARY_CONTRACT.limitation
  };
  return result;
}

export function getEvidencePromotionContract() {
  return EVIDENCE_PROMOTION_CONTRACT;
}

export function getCommitBoundaryContract({ phase, actionClass } = {}) {
  const result = { ...COMMIT_BOUNDARY_CONTRACT };
  if (actionClass) result.selectedActionClass = { [actionClass]: COMMIT_BOUNDARY_CONTRACT.actionClasses[actionClass] };
  if (phase === "PHASE_1") {
    delete result.phase2;
    result.selectedPhase = "PHASE_1";
  } else if (phase === "PHASE_2") {
    delete result.phase1;
    result.selectedPhase = "PHASE_2";
  }
  return result;
}

export function getApplicationMapping({ mapping = "agentic-er", section = "all" } = {}) {
  if (mapping === "policy-as-code") {
    return {
      metadata: REFERENCE_STATUS.applicationMappings.policyAsCode,
      obligations: POLICY_AS_CODE_OBLIGATIONS,
      integrationBoundary: "OPA/Rego and Cedar can evaluate supplied policy inputs; neither supplies the complete evidence-promotion trust base, graph transaction, version check, or protected write enforcement by itself."
    };
  }
  const parts = {
    overview: {
      centralPath: COMMIT_BOUNDARY_CONTRACT.architecture,
      localConcepts: 120,
      qualifiedRelationAssertions: 206,
      epistemicStatuses: ["specified", "assumed", "illustrative", "proposed-evaluation", "future-research", "canonical-reference"]
    },
    "diagnostic-to-constraint": { bindings: CONSTRAINT_BINDINGS, note: "All listed bindings are illustrative, domain-supplied examples; they are not universal executable rules." },
    evidence: EVIDENCE_PROMOTION_CONTRACT,
    authorization: COMMIT_BOUNDARY_CONTRACT,
    boundary: { currentArchitecture: "Protected mutation boundary", futureResearch: "Dependency-aware evidence lineage and control of the full hypothesis-conditioned feedback loop; not part of the current Supervisor contract." }
  };
  return {
    metadata: REFERENCE_STATUS.applicationMappings.agenticEr,
    sections: section === "all" ? parts : { [section]: parts[section] ?? null },
    relationshipToCanonicalVocabulary: "Reuses canonical DIO/ODI identifiers and definitions. Paper-specific architecture constructs remain in a derived, non-normative application mapping namespace and do not extend the canonical Reference Vocabulary.",
    sources: [REFERENCE_STATUS.applicationMappings.agenticEr.sourcePaper, REFERENCE_STATUS.applicationMappings.agenticEr.page]
  };
}
