import packageJson from "../package.json";
import { McpServer } from "@modelcontextprotocol/server";
import { limitRequestBody } from "./body-limit.mjs";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import {
  CONCEPTS,
  EVIDENCE_PROMOTION_CONTRACT,
  COMMIT_BOUNDARY_CONTRACT,
  RESOURCE_DOCS,
  REFERENCE_STATUS
} from "./catalog.mjs";
import {
  buildMutationGuardrailProfile,
  findConcept,
  getApplicationMapping,
  getCommitBoundaryContract,
  getEvidencePromotionContract,
  getReconstructionFailureProfile,
  getRelations,
  searchConcepts
} from "./profile.mjs";

interface Env {
  ALLOWED_ORIGINS?: string;
  MCP_RATE_LIMITER?: { limit: (input: { key: string }) => Promise<{ success: boolean }> };
}

const SERVICE_VERSION = packageJson.version;

const FAILURE_MODE_IDS = [
  "EntitySubstitution", "MergeFailure", "SplitFailure", "EntityOmission",
  "SemanticFragmentation", "TemporalDiscontinuity", "TemporalMisalignment", "ContextualDisplacement"
] as const;
const DOMAIN_IDS = ["RRF", "SCF", "TRF", "CAF"] as const;
const ACTION_CLASSES = ["READ", "STAGE_LOCAL", "REVERSIBLE_WRITE", "IRREVERSIBLE_WRITE"] as const;
const MUTATION_TYPES = ["MERGE", "SPLIT", "UNMERGE", "OTHER"] as const;
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>
  };
}

function createServer() {
    const server = new McpServer(
    {
      name: "dio-odi-mcp",
      version: SERVICE_VERSION
    },
    {
      instructions: "Public read-only DIO/ODI reference service. For Agentic ER, start with get_mutation_guardrail_profile. Treat canonical definitions as canonical-reference and mapping examples as illustrative. This server does not instantiate domain policy, assess evidence, authorize a mutation, or return commit verdicts. The integrating application must perform evidence promotion, Supervisor checks, version validation, and atomic persistence locally."
    }
  );

  server.registerTool(
    "get_mutation_guardrail_profile",
    {
      title: "Get mutation guardrail profile",
      description: "Main Agentic ER use case. Returns the applicable DIO/ODI diagnostic dimensions, illustrative diagnostic-to-constraint mappings, evidence-promotion requirements, and Phase 1/Phase 2 commit-boundary checks for a proposed action class and mutation type. It does not evaluate evidence, instantiate domain policy, issue authorization, or return a commit verdict.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        actionClass: z.enum(ACTION_CLASSES).default("IRREVERSIBLE_WRITE"),
        mutationType: z.enum(MUTATION_TYPES).default("MERGE"),
        entityClass: z.string().max(160).optional(),
        observationDomain: z.string().max(160).optional(),
        temporalScope: z.string().max(160).optional(),
        domainPolicyVersion: z.string().max(120).optional(),
        failureModes: z.array(z.enum(FAILURE_MODE_IDS)).max(8).optional(),
        include: z.array(z.enum(["evidence_requirements", "commit_checks"])).max(2).optional()
      })
    },
    async (input) => jsonResult(buildMutationGuardrailProfile(input))
  );

  server.registerTool(
    "get_reconstruction_failure_profile",
    {
      title: "Get Reconstruction Failure profile",
      description: "Returns the non-exclusive four-domain Reconstruction Failure taxonomy and its eight failure modes, their diagnostic distinctions, and the paper's explicitly illustrative mappings where requested.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        domains: z.array(z.enum(DOMAIN_IDS)).max(4).optional(),
        failureModes: z.array(z.enum(FAILURE_MODE_IDS)).max(8).optional(),
        include: z.array(z.enum(["definitions", "diagnostic_boundaries", "constraint_mappings", "source_provenance"])).max(4).default(["definitions", "diagnostic_boundaries", "constraint_mappings", "source_provenance"])
      })
    },
    async (input) => jsonResult(getReconstructionFailureProfile(input))
  );

  server.registerTool(
    "get_evidence_promotion_contract",
    {
      title: "Get evidence promotion contract",
      description: "Returns the distinction between quarantine admission, Planner-visible UNVERIFIED evidence, claim-specific P_auth eligibility, evidentiary roles, conflict outcomes, and the seven promotion requirements.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({})
    },
    async () => jsonResult(getEvidencePromotionContract())
  );

  server.registerTool(
    "get_commit_boundary_contract",
    {
      title: "Get commit-boundary contract",
      description: "Returns the abstract action-class, Phase 1 pre-execution authorization, Phase 2 post-execution validation, commit invariant, version binding, outcome precedence, and conditional assumptions from Constraining the Commit Boundary v2.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        phase: z.enum(["PHASE_1", "PHASE_2"]).optional(),
        actionClass: z.enum(ACTION_CLASSES).optional()
      })
    },
    async (input) => jsonResult(getCommitBoundaryContract(input))
  );

  server.registerTool(
    "search_concepts",
    {
      title: "Search DIO/ODI concepts",
      description: "Searches the versioned 40-concept canonical DIO/ODI Reference Vocabulary snapshot by preferred label, alternate label, URI fragment, definition, or scope note.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({ query: z.string().min(1).max(180), limit: z.number().int().min(1).max(30).default(10) })
    },
    async ({ query, limit }) => jsonResult({ concepts: searchConcepts(query, limit), vocabularyVersion: REFERENCE_STATUS.referenceVocabulary.version })
  );

  server.registerTool(
    "get_concept",
    {
      title: "Get canonical concept",
      description: "Returns the canonical URI, definition, scope note, and direct vocabulary relations for one concept in the current Reference Vocabulary snapshot.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({ identifier: z.string().min(1).max(240) })
    },
    async ({ identifier }) => {
      const concept = findConcept(identifier);
      if (!concept) return jsonResult({ found: false, identifier, message: "No matching concept in the bundled Reference Vocabulary v0.2.2 snapshot." });
      return jsonResult({ found: true, concept, vocabularyVersion: REFERENCE_STATUS.referenceVocabulary.version });
    }
  );

  server.registerTool(
    "get_relations",
    {
      title: "Get concept relations",
      description: "Returns direct broader, narrower, and related links for a canonical DIO/ODI concept. This is not a SPARQL endpoint or a general graph query engine.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({ identifier: z.string().min(1).max(240) })
    },
    async ({ identifier }) => jsonResult(getRelations(identifier) ?? { found: false, identifier })
  );

  server.registerTool(
    "get_application_mapping",
    {
      title: "Get DIO/ODI application mapping",
      description: "Returns a bounded section of the derived Agentic ER commit-boundary architecture mapping or the Policy-as-Code mapping. Derived mappings are non-normative and keep their epistemic status explicit.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({
        mapping: z.enum(["agentic-er", "policy-as-code"]).default("agentic-er"),
        section: z.enum(["all", "overview", "diagnostic-to-constraint", "evidence", "authorization", "boundary"]).default("all")
      })
    },
    async (input) => jsonResult(getApplicationMapping(input))
  );

  server.registerTool(
    "get_policy_as_code_mapping",
    {
      title: "Get Policy-as-Code mapping",
      description: "Returns the 11 integration obligations mapped to OPA/Rego and Cedar, including the boundary between policy evaluation and application-level evidence, version, and write enforcement.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({})
    },
    async () => jsonResult(getApplicationMapping({ mapping: "policy-as-code" }))
  );

  server.registerTool(
    "get_reference_status",
    {
      title: "Get Reference Model status",
      description: "Returns current release, Vocabulary, application mapping, and live Semantic Change Feed version metadata with the archive/live distinction made explicit.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: z.object({})
    },
    async () => jsonResult(REFERENCE_STATUS)
  );

  for (const [uri, resource] of Object.entries(RESOURCE_DOCS)) {
    server.registerResource(
      resource.name,
      uri,
      { title: resource.name, description: `Versioned read-only DIO/ODI resource: ${resource.name}.`, mimeType: resource.mimeType },
      async (requestedUri) => ({
        contents: [{ uri: requestedUri.href, mimeType: resource.mimeType, text: JSON.stringify(resource.content, null, 2) }]
      })
    );
  }

  server.registerPrompt(
    "plan_mutation_guardrail_integration",
    {
      title: "Plan a mutation guardrail integration",
      description: "Builds an integration-planning prompt using the DIO/ODI commit-boundary contract. It explicitly separates reference mappings from executable policy and runtime authorization.",
      argsSchema: z.object({
        actionClass: z.enum(ACTION_CLASSES).default("IRREVERSIBLE_WRITE"),
        mutationType: z.enum(MUTATION_TYPES).default("MERGE"),
        entityClass: z.string().max(160).optional(),
        observationDomain: z.string().max(160).optional(),
        temporalScope: z.string().max(160).optional(),
        domainPolicyVersion: z.string().max(120).optional()
      })
    },
    ({ actionClass, mutationType, entityClass, observationDomain, temporalScope, domainPolicyVersion }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Prepare an implementation integration plan for the DIO/ODI-informed Agentic ER guardrail.",
            `Action class: ${actionClass}. Mutation type: ${mutationType}.`,
            `Entity class: ${entityClass ?? "not supplied"}. Observation domain: ${observationDomain ?? "not supplied"}.`,
            `Temporal scope: ${temporalScope ?? "not supplied"}. Domain policy version: ${domainPolicyVersion ?? "not supplied"}.`,
            "Use the MCP tools get_mutation_guardrail_profile, get_evidence_promotion_contract, and get_commit_boundary_contract as reference inputs.",
            "Keep the canonical vocabulary, non-normative derived mappings, caller-supplied domain policy, evidence-promotion validator, Supervisor, and transactional commit enforcement separate.",
            "Do not invent a universal policy, infer facts from labels, treat illustrative bindings as executable rules, implement dependency-aware evidence flow as if it were in the current paper, or return a PASS/BREACH/UNKNOWN_EVIDENCE decision without actual application state and policy.",
            "Specify interfaces, version bindings, data ownership, failure handling, tests, and the exact assumptions that the integrating application must satisfy."
          ].join("\n")
        }
      }]
    })
  );

  return server;
}

const HOME_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DIO/ODI MCP v__SERVICE_VERSION__ | Read-only Model Context Protocol service</title>
<meta name="description" content="Public, stateless, read-only Model Context Protocol interface to the DIO/ODI Reference Model and selected Agentic ER and Policy-as-Code mappings.">
<meta name="author" content="Daniel Beránek">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<link rel="canonical" href="https://mcp.danielberanek.cz/">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="DIO/ODI MCP">
<meta property="og:description" content="A public, stateless, read-only MCP interface to versioned DIO/ODI reference data and derived integration mappings.">
<meta property="og:url" content="https://mcp.danielberanek.cz/">
<meta property="og:site_name" content="DIO/ODI MCP">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="DIO/ODI MCP">
<meta name="twitter:description" content="Read-only MCP interface to the DIO/ODI Reference Model and selected derived mappings.">
<style>
:root {
  color-scheme: dark; --page-bg:#111113; --surface:#1b1b1f; --surface-raised:#232329;
  --surface-soft:#19191d; --text:#e8e8ed; --muted:#b1b1bb; --border:#414149;
  --border-strong:#585861; --link:#9bbcff; --link-hover:#c9d9ff; --code-bg:#25252b;
  --content-width:72rem; --page-gutter:clamp(1rem,2.2vw,1.6rem);
}
*,*::before,*::after { box-sizing:border-box; }
html { background:var(--page-bg); color-scheme:dark; scroll-behavior:smooth; scrollbar-color:var(--border-strong) var(--page-bg); }
body { width:min(calc(100% - 1.5rem),var(--content-width)); margin:clamp(2rem,4vw,4rem) auto; padding-inline:var(--page-gutter); background:var(--page-bg); color:var(--text); font:1rem/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; overflow-wrap:anywhere; }
a { color:var(--link); text-decoration-thickness:.08em; text-underline-offset:.16em; } a:hover { color:var(--link-hover); }
a:focus-visible { outline:2px solid var(--link); outline-offset:3px; border-radius:.15rem; }
strong,b { color:#f3f3f7; }
.site-nav { display:flex; flex-wrap:wrap; align-items:center; gap:.35rem 1.05rem; width:100%; margin:0 0 1.75rem; padding:.72rem 1rem; border:1px solid var(--border); border-radius:.65rem; background:var(--surface); font-size:.94rem; line-height:1.35; }
.site-nav a { display:inline-flex; align-items:center; padding:.25rem .1rem; text-decoration:none; font-weight:500; }
.site-nav a[aria-current="page"] { font-weight:700; text-decoration:underline; text-decoration-color:var(--border-strong); text-decoration-thickness:2px; text-underline-offset:.32em; }
.page-hero { margin:0 0 2.5rem; padding:clamp(1.2rem,3vw,2.2rem); border:1px solid var(--border); border-radius:.85rem; background:linear-gradient(145deg,var(--surface-raised),var(--surface)); }
.page-hero-kicker { margin:0 auto .45rem; color:var(--muted); font-size:.86rem; font-weight:650; letter-spacing:.085em; line-height:1.4; text-align:center; text-transform:uppercase; }
h1 { width:min(100%,68ch); margin:.65rem auto .85rem; color:var(--text); font-size:clamp(1.85rem,3.5vw,2.65rem); letter-spacing:-.027em; line-height:1.18; text-align:center; text-wrap:balance; }
.page-hero-lead { width:min(100%,66ch); margin:0 auto; color:var(--muted); font-size:1.075rem; line-height:1.65; text-align:center; }
.page-hero-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.8rem; margin:1.35rem auto 0; }
.page-hero-stat { min-width:0; padding:.9rem 1rem; border:1px solid var(--border); border-radius:.65rem; background:var(--surface); text-align:center; }
.page-hero-stat strong { display:block; font-size:1.4rem; line-height:1.3; } .page-hero-stat span { color:var(--muted); font-size:.85rem; }
.endpoint { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:.4rem 1rem; margin:1.2rem auto 0; padding:.85rem 1rem; border:1px solid var(--border); border-radius:.65rem; background:var(--surface); }
.endpoint p { margin:.15rem 0; } .endpoint code { font-size:1rem; }
main,footer { width:100%; } section { margin-block:2.7rem; scroll-margin-top:1.2rem; }
h2 { margin:0 auto .85rem; color:var(--text); font-size:clamp(1.35rem,2vw,1.75rem); line-height:1.22; }
h3 { margin:.25rem 0 .6rem; color:var(--text); font-size:1.13rem; line-height:1.3; }
p { margin:.85rem auto; } .intro { max-width:66ch; color:var(--muted); }
.card-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.card { min-width:0; padding:1.15rem 1.25rem; border:1px solid var(--border); border-radius:.7rem; background:var(--surface); }
.card p:last-child { margin-bottom:0; }
.tag { display:inline-block; padding:.12rem .55rem; border:1px solid var(--border-strong); border-radius:999px; color:var(--muted); font-size:.82rem; }
.note { margin-block:1.2rem; padding:.85rem 1rem .85rem 1.15rem; border-left:4px solid var(--border-strong); border-radius:.45rem; background:var(--surface-soft); color:var(--muted); }
pre { max-width:100%; overflow:auto; margin:1rem 0; padding:1rem 1.1rem; border:1px solid var(--border); border-radius:.55rem; background:var(--surface-soft); color:var(--text); font:.92rem/1.55 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace; tab-size:2; }
code,kbd,samp { border-radius:.25rem; padding:.12rem .32rem; background:var(--code-bg); color:#ededf4; font-size:.92em; overflow-wrap:anywhere; } pre code { padding:0; background:transparent; overflow-wrap:normal; }
.table-wrap { max-width:100%; overflow-x:auto; overscroll-behavior-x:contain; }
table { width:100%; margin-block:1.2rem; border-collapse:collapse; color:var(--text); font-size:.92rem; line-height:1.55; }
th,td { padding:.7rem .75rem; border:1px solid var(--border); text-align:left; vertical-align:top; } th { background:var(--surface-raised); color:#f2f2f6; font-weight:650; } td { background:var(--surface-soft); } td:first-child { min-width:15rem; }
ul { padding-left:1.4rem; } li+li { margin-top:.35rem; }
.resource-list { columns:2; column-gap:2rem; } .resource-list li { break-inside:avoid; margin-bottom:.4rem; }
.definition-list { margin:1rem 0; padding:0; }
.definition-list>div { display:grid; grid-template-columns:minmax(12rem,.34fr) minmax(0,1fr); gap:.5rem 1.2rem; padding:.85rem 1rem; border-bottom:1px solid var(--border); background:var(--surface-soft); }
.definition-list>div:first-child { border-top:1px solid var(--border); } .definition-list dt { font-weight:700; } .definition-list dd { margin:0; color:var(--muted); }
.site-footer { margin-top:2.5rem; padding-top:1.2rem; border-top:1px solid var(--border); color:var(--muted); font-size:.92rem; } .site-footer p { margin:.4rem 0; }
hr { border:0; border-top:1px solid var(--border); margin-block:2rem; }
@media (max-width:760px) {
  body { width:100%; margin-block:1.5rem; padding-inline:1rem; font-size:.98rem; }
  .site-nav { gap:.45rem .8rem; padding:.65rem .75rem; }
  .card-grid,.page-hero-metrics { grid-template-columns:1fr; }
  .page-hero { padding:1rem; } .definition-list>div { grid-template-columns:1fr; gap:.25rem; }
  .resource-list { columns:1; } table { font-size:.88rem; } th,td { padding:.55rem; }
}
@media (prefers-reduced-motion:reduce) { html { scroll-behavior:auto; } }
</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://mcp.danielberanek.cz/#website","url":"https://mcp.danielberanek.cz/","name":"DIO/ODI MCP","inLanguage":"en","isPartOf":{"@id":"https://vocab.danielberanek.cz/#website"}},{"@type":"WebPage","@id":"https://mcp.danielberanek.cz/#webpage","url":"https://mcp.danielberanek.cz/","name":"DIO/ODI MCP","description":"Public, stateless, read-only MCP interface to versioned DIO/ODI reference data and selected derived mappings.","inLanguage":"en","isPartOf":{"@id":"https://mcp.danielberanek.cz/#website"},"about":{"@id":"https://vocab.danielberanek.cz/dio-odi/#ReferenceVocabulary"}},{"@type":"SoftwareApplication","@id":"https://mcp.danielberanek.cz/#software","name":"DIO/ODI MCP","applicationCategory":"DeveloperApplication","operatingSystem":"Any","softwareVersion":"__SERVICE_VERSION__","url":"https://mcp.danielberanek.cz/","codeRepository":"https://github.com/dan-beranek/dio-odi-mcp","sameAs":["https://doi.org/10.5281/zenodo.24123229","https://doi.org/10.5281/zenodo.24123228"],"provider":{"@id":"https://danielberanek.cz/#person"}},{"@type":"Person","@id":"https://danielberanek.cz/#person","name":"Daniel Beránek","url":"https://danielberanek.cz/","sameAs":"https://orcid.org/0009-0004-0050-0264"}]}
</script>
</head>
<body>
<nav class="site-nav" aria-label="Primary navigation">
<a href="https://vocab.danielberanek.cz/" aria-label="DIO/ODI Reference Model home">DIO/ODI Reference Model</a>
<a href="https://vocab.danielberanek.cz/dio-odi/">Reference Vocabulary</a>
<a href="https://vocab.danielberanek.cz/mappings/">Application Mappings</a>
<a href="#quick-start" aria-current="page">MCP service</a>
<a href="https://github.com/dan-beranek/dio-odi-mcp">Source repository</a>
</nav>
<header class="page-hero">
<p class="page-hero-kicker">DIO/ODI · Agent-facing distribution</p>
<h1>DIO/ODI MCP</h1>
<p class="page-hero-lead">A public, stateless, read-only Model Context Protocol interface to a versioned DIO/ODI Reference Model snapshot and selected derived Agentic ER and Policy-as-Code mappings.</p>
<div class="page-hero-metrics">
<div class="page-hero-stat"><strong>v__SERVICE_VERSION__</strong><span>Software release</span></div>
<div class="page-hero-stat"><strong>10</strong><span>Read-only tools</span></div>
<div class="page-hero-stat"><strong>7</strong><span>Resources · 1 prompt</span></div>
</div>
<div class="endpoint">
<p><strong>MCP endpoint</strong><br><code>https://mcp.danielberanek.cz/mcp</code></p>
<p><a href="/healthz">Health status</a> · <a href="https://github.com/dan-beranek/dio-odi-mcp">Source code</a></p>
</div>
</header>
<main>
<section id="quick-start">
<h2>Quick start</h2>
<p class="intro">For MCP clients that support a remote Streamable HTTP server, register the endpoint directly:</p>
<pre><code>{
  "mcpServers": {
    "dio-odi": {
      "url": "https://mcp.danielberanek.cz/mcp"
    }
  }
}</code></pre>
<p>Use the client’s documented remote-server configuration format. Clients that require a local stdio process need a compatible bridge; see the <a href="https://github.com/dan-beranek/dio-odi-mcp/tree/main/examples">client examples</a> and <a href="https://github.com/dan-beranek/dio-odi-mcp#client-configuration-examples">README instructions</a>.</p>
<div class="note"><strong>Transport:</strong> Streamable HTTP · stateless · protocol revision <code>2026-07-28</code> · read-only. The <code>/mcp</code> endpoint is for MCP clients, not a browser-readable API page.</div>
</section>
<section id="use-cases">
<h2>Start with a use case</h2>
<p class="intro">The service exposes bounded reference material for an integrating application. Choose the entry point that matches the work being designed.</p>
<div class="card-grid">
<article class="card"><span class="tag">Agentic ER</span><h3>Identity-changing mutation</h3><p>Retrieve a mutation-specific diagnostic profile for a proposed merge, split, or unmerge.</p><p><code>get_mutation_guardrail_profile</code></p></article>
<article class="card"><span class="tag">Evidence</span><h3>Evidence admission and promotion</h3><p>Inspect the reference contract for quarantine, UNVERIFIED evidence, claim-specific eligibility, and promotion requirements.</p><p><code>get_evidence_promotion_contract</code></p></article>
<article class="card"><span class="tag">Commit boundary</span><h3>Two-phase mutation boundary</h3><p>Retrieve the action-class and Phase 1 / Phase 2 interface requirements from the Agentic ER architecture.</p><p><code>get_commit_boundary_contract</code></p></article>
<article class="card"><span class="tag">Reconstruction diagnostics</span><h3>Classify failure dimensions</h3><p>Look up the non-exclusive four-domain taxonomy and its eight Reconstruction Failure modes.</p><p><code>get_reconstruction_failure_profile</code></p></article>
<article class="card"><span class="tag">Policy-as-Code</span><h3>OPA/Rego and Cedar</h3><p>Review the derived integration obligations and the boundary between policy evaluation and application enforcement.</p><p><code>get_policy_as_code_mapping</code></p></article>
<article class="card"><span class="tag">Canonical vocabulary</span><h3>Find concepts and relations</h3><p>Search the bundled vocabulary snapshot, retrieve a concept, or inspect its direct SKOS relations.</p><p><code>search_concepts</code> · <code>get_concept</code> · <code>get_relations</code></p></article>
</div>
</section>
<section id="example">
<h2>Example tool input</h2>
<p class="intro">A client can request a bounded profile for an irreversible legal-entity merge. The following is an illustrative tool argument object, not a response or an authorization verdict.</p>
<pre><code>{
  "actionClass": "IRREVERSIBLE_WRITE",
  "mutationType": "MERGE",
  "entityClass": "legal-entity",
  "observationDomain": "corporate-compliance",
  "temporalScope": "2020-01-01/2026-11-11",
  "domainPolicyVersion": "policy-2026-11",
  "failureModes": ["EntitySubstitution", "MergeFailure", "TemporalMisalignment"],
  "include": ["evidence_requirements", "commit_checks"]
}</code></pre>
<p>The tool returns the selected diagnostic domains and failure modes, illustrative diagnostic-to-constraint mappings, caller-supplied context and missing fields, reference-version provenance, and the requested evidence-promotion and commit-boundary material. It does not assess the supplied context or decide whether the mutation may proceed.</p>
</section>
<section id="tools">
<h2>Tool reference</h2>
<p class="intro">Ten read-only tools are registered. Inputs shown below are the accepted fields; optional fields and defaults are defined by each tool schema.</p>
<div class="table-wrap"><table>
<thead><tr><th>Tool</th><th>Input</th><th>Output / use</th></tr></thead>
<tbody>
<tr><td><code>get_mutation_guardrail_profile</code></td><td><code>actionClass</code>, <code>mutationType</code>, <code>entityClass</code>, <code>observationDomain</code>, <code>temporalScope</code>, <code>domainPolicyVersion</code>, <code>failureModes</code>, <code>include</code></td><td>Bounded Agentic ER profile with diagnostics, illustrative mappings, evidence requirements, and commit-boundary checks.</td></tr>
<tr><td><code>get_reconstruction_failure_profile</code></td><td><code>domains</code>, <code>failureModes</code>, <code>include</code></td><td>Four diagnostic domains, eight failure modes, definitions, boundaries, mappings, and provenance.</td></tr>
<tr><td><code>get_evidence_promotion_contract</code></td><td>None</td><td>Evidence admission, quarantine, UNVERIFIED state, claim-specific P_auth eligibility, and promotion requirements.</td></tr>
<tr><td><code>get_commit_boundary_contract</code></td><td><code>phase</code>, <code>actionClass</code></td><td>Action classes, Phase 1 and Phase 2 requirements, commit invariant, version bindings, and assumptions.</td></tr>
<tr><td><code>search_concepts</code></td><td>Required <code>query</code>; optional <code>limit</code></td><td>Search results from the bundled canonical Reference Vocabulary snapshot.</td></tr>
<tr><td><code>get_concept</code></td><td>Required <code>identifier</code></td><td>One canonical concept, including its URI, definition, scope note, and direct relations.</td></tr>
<tr><td><code>get_relations</code></td><td>Required <code>identifier</code></td><td>Direct broader, narrower, and related SKOS links; not a general graph query engine.</td></tr>
<tr><td><code>get_application_mapping</code></td><td><code>mapping</code>, <code>section</code></td><td>A bounded section of the derived Agentic ER or Policy-as-Code mapping.</td></tr>
<tr><td><code>get_policy_as_code_mapping</code></td><td>None</td><td>Eleven derived integration obligations for OPA/Rego and Cedar.</td></tr>
<tr><td><code>get_reference_status</code></td><td>None</td><td>Archived Reference Model, Vocabulary, mappings, and live Semantic Change Feed version metadata.</td></tr>
</tbody></table></div>
<h3>Resources and prompt</h3>
<p>The server also publishes seven read-only resources:</p>
<ul class="resource-list">
<li><code>dio-odi://reference/status</code></li>
<li><code>dio-odi://reference/vocabulary</code></li>
<li><code>dio-odi://diagnostics/reconstruction-failure-taxonomy</code></li>
<li><code>dio-odi://contracts/evidence-promotion</code></li>
<li><code>dio-odi://contracts/commit-boundary</code></li>
<li><code>dio-odi://mappings/agentic-er</code></li>
<li><code>dio-odi://mappings/policy-as-code</code></li>
</ul>
<p>One integration-planning prompt is available: <code>plan_mutation_guardrail_integration</code>.</p>
</section>
<section id="boundaries">
<h2>What this service does not do</h2>
<div class="note"><strong>Reference interface, not enforcement.</strong> DIO/ODI MCP is not an MVDIO Supervisor and not an authorization service. It provides versioned reference and diagnostic inputs; enforcement remains with the integrating application.</div>
<dl class="definition-list">
<div><dt>Application state</dt><dd>It does not inspect an integrating application’s graph, evidence stores, policies, promotion records, or snapshots.</dd></div>
<div><dt>Evidence and policy</dt><dd>It does not assess evidence, perform claim-conflict checks, instantiate domain policy, or turn illustrative mappings into executable rules.</dd></div>
<div><dt>Authorization</dt><dd>It does not issue authorization tokens, make Phase 1 / Phase 2 decisions, or return PASS, BREACH, or UNKNOWN_EVIDENCE verdicts.</dd></div>
<div><dt>Persistence</dt><dd>It does not commit or revert application writes. Version validation, Supervisor checks, and atomic persistence remain local to the integrating system.</dd></div>
</dl>
<p>The canonical Reference Vocabulary and the derived Agentic ER / Policy-as-Code mappings are distinct layers. The mappings are non-normative applications; they do not redefine canonical DIO/ODI concepts.</p>
</section>
<section id="provenance">
<h2>Versions and provenance</h2>
<div class="table-wrap"><table><tbody>
<tr><th>Software</th><td>DIO/ODI MCP v__SERVICE_VERSION__ · <a href="https://doi.org/10.5281/zenodo.24123229">version DOI</a> · <a href="https://doi.org/10.5281/zenodo.24123228">Concept DOI</a></td></tr>
<tr><th>Reference Model archive</th><td>v0.9.0 · <a href="https://doi.org/10.5281/zenodo.24085589">10.5281/zenodo.24085589</a></td></tr>
<tr><th>Reference Vocabulary</th><td>v0.2.2 · <a href="https://vocab.danielberanek.cz/dio-odi/">Canonical SKOS vocabulary</a></td></tr>
<tr><th>Agentic ER mapping</th><td>v0.3.1 · <a href="https://vocab.danielberanek.cz/mappings/agentic-er-architecture/">Derived architecture mapping</a></td></tr>
<tr><th>Policy-as-Code mapping</th><td>Derived, non-normative · <a href="https://vocab.danielberanek.cz/mappings/commit-boundary-policy/">Mapping for OPA/Rego and Cedar</a></td></tr>
<tr><th>Research paper</th><td><a href="https://arxiv.org/abs/2610.37407v2">Constraining the Commit Boundary (v2)</a></td></tr>
</tbody></table></div>
<p>Reference Model archive metadata and the live Semantic Change Feed represent distinct versioned states. The service exposes the versions bundled in its snapshot; a later live-feed update does not retroactively modify the archived Reference Model.</p>
<p>For complete tool schemas, development instructions, tests, deployment notes, and license boundaries, see the <a href="https://github.com/dan-beranek/dio-odi-mcp">source repository</a>, <a href="https://github.com/dan-beranek/dio-odi-mcp/blob/main/README.md">README</a>, and <a href="https://github.com/dan-beranek/dio-odi-mcp/blob/main/schemas/mcp-contract.json">machine-readable contract</a>.</p>
</section>
</main>
<footer class="site-footer">
<p>Daniel Beránek · <a href="https://orcid.org/0009-0004-0050-0264">ORCID 0009-0004-0050-0264</a> · <a href="https://danielberanek.cz/manifest-dio/">DIO/ODI Hub</a></p>
<p><a href="https://github.com/dan-beranek/dio-odi-mcp">Source repository</a> · <a href="/healthz">Health status</a> · <a href="https://vocab.danielberanek.cz/">DIO/ODI Reference Model</a></p>
<p>Software implementation: MIT · Embedded DIO/ODI reference content: CC BY 4.0</p>
</footer>
</body>
</html>`;

const handler = createMcpHandler(createServer, {
  route: "/mcp",
  legacy: "reject",
  allowedHostnames: ["mcp.danielberanek.cz", "localhost", "127.0.0.1"],
  allowedOriginHostnames: [
    "mcp.danielberanek.cz",
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "localhost",
    "127.0.0.1"
  ]
});

function allowedOrigins(env: Env): Set<string> {
  const raw = env.ALLOWED_ORIGINS ?? "https://mcp.danielberanek.cz,http://localhost:5173,http://127.0.0.1:5173";
  return new Set(raw.split(",").map((x) => x.trim()).filter(Boolean));
}

function corsHeaders(origin: string | null, allowed: boolean): Headers {
  const headers = new Headers();
  if (origin && allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "false");
  }
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Method, Mcp-Name");
  headers.set("Access-Control-Expose-Headers", "Mcp-Protocol-Version");
  headers.set("Cache-Control", "no-store");
  return headers;
}

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  const out = new Headers(headers);
  out.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers: out });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(HOME_PAGE_HTML.replaceAll("__SERVICE_VERSION__", SERVICE_VERSION), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }
      });
    }

    if (url.pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
      const health = { status: "ok", service: "dio-odi-mcp", version: SERVICE_VERSION, mode: "read-only", referenceModel: REFERENCE_STATUS.referenceModel.archivedVersion, vocabulary: REFERENCE_STATUS.referenceVocabulary.version, mapping: REFERENCE_STATUS.applicationMappings.agenticEr.version };
      return request.method === "HEAD" ? new Response(null, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }) : jsonResponse(health);
    }

    if (url.pathname !== "/mcp") return jsonResponse({ error: "not_found" }, 404);

    const origin = request.headers.get("Origin");
    const allowed = !origin || allowedOrigins(env).has(origin);
    const headers = corsHeaders(origin, allowed);
    if (!allowed) return jsonResponse({ error: "origin_not_allowed" }, 403, headers);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") {
      headers.set("Allow", "POST, OPTIONS");
      return jsonResponse({ error: "method_not_allowed", detail: "Use an MCP client with Streamable HTTP POST on /mcp." }, 405, headers);
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 65536) return jsonResponse({ error: "request_too_large", maxBytes: 65536 }, 413, headers);

    if (env.MCP_RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") ?? "anonymous";
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: `mcp-public:${ip}` });
      if (!success) return jsonResponse({ error: "rate_limited", retryable: true }, 429, headers);
    }

    let boundedRequest: Request;
    try {
      const limited = await limitRequestBody(request, 65536);
      if (!limited) return jsonResponse({ error: "request_too_large", maxBytes: 65536 }, 413, headers);
      boundedRequest = limited;
    } catch {
      return jsonResponse({ error: "invalid_request_body" }, 400, headers);
    }

    const response = await handler(boundedRequest, env, ctx);
    const mergedHeaders = new Headers(response.headers);
    for (const [key, value] of headers.entries()) mergedHeaders.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: mergedHeaders });
  }
};
