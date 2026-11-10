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
      version: "0.1.0"
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
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version");
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
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DIO/ODI MCP</title></head><body><main><h1>DIO/ODI MCP</h1><p>Public, read-only Model Context Protocol server for the DIO/ODI Reference Model and derived Agentic ER guardrail mappings.</p><p><strong>MCP endpoint:</strong> <code>https://mcp.danielberanek.cz/mcp</code></p><p><a href="/healthz">Health status</a> · <a href="https://github.com/dan-beranek/dio-odi-reference-model">Reference Model</a> · <a href="https://arxiv.org/abs/2610.37407v2">Constraining the Commit Boundary v2</a></p><p>Connect with an MCP client. The /mcp endpoint is not a human-readable web page.</p></main></body></html>`, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }
      });
    }

    if (url.pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
      const health = { status: "ok", service: "dio-odi-mcp", version: "0.1.0", mode: "read-only", referenceModel: REFERENCE_STATUS.referenceModel.archivedVersion, vocabulary: REFERENCE_STATUS.referenceVocabulary.version, mapping: REFERENCE_STATUS.applicationMappings.agenticEr.version };
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

    let boundedRequest: Request;
    try {
      const limited = await limitRequestBody(request, 65536);
      if (!limited) return jsonResponse({ error: "request_too_large", maxBytes: 65536 }, 413, headers);
      boundedRequest = limited;
    } catch {
      return jsonResponse({ error: "invalid_request_body" }, 400, headers);
    }

    if (env.MCP_RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") ?? "anonymous";
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: `mcp-public:${ip}` });
      if (!success) return jsonResponse({ error: "rate_limited", retryable: true }, 429, headers);
    }

    const response = await handler(boundedRequest, env, ctx);
    const mergedHeaders = new Headers(response.headers);
    for (const [key, value] of headers.entries()) mergedHeaders.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: mergedHeaders });
  }
};
