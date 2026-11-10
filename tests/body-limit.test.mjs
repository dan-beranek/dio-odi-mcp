import assert from "node:assert/strict";
import test from "node:test";
import { limitRequestBody } from "../src/body-limit.mjs";

const LIMIT = 65536;

function requestFromChunks(chunks, headers = {}) {
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    }
  });
  return new Request("https://example.test/mcp", {
    method: "POST",
    headers,
    body,
    duplex: "half"
  });
}

test("accepts a body below the byte limit", async () => {
  const request = requestFromChunks(["small body"]);
  const result = await limitRequestBody(request, LIMIT);
  assert.ok(result instanceof Request);
  assert.equal(await result.text(), "small body");
});

test("accepts a body exactly at the byte limit", async () => {
  const request = requestFromChunks(["a".repeat(LIMIT)]);
  const result = await limitRequestBody(request, LIMIT);
  assert.ok(result instanceof Request);
  assert.equal((await result.arrayBuffer()).byteLength, LIMIT);
});

test("rejects a body over the byte limit without Content-Length", async () => {
  const request = requestFromChunks(["a".repeat(LIMIT), "b"]);
  const result = await limitRequestBody(request, LIMIT);
  assert.equal(result, null);
});

test("rejects a body over the byte limit even when Content-Length is understated", async () => {
  const request = requestFromChunks(["a".repeat(LIMIT + 1)], { "Content-Length": "1" });
  const result = await limitRequestBody(request, LIMIT);
  assert.equal(result, null);
});

test("rebuilds accepted requests without a stale Content-Length header", async () => {
  const request = requestFromChunks(["safe"], { "Content-Length": "999" });
  const result = await limitRequestBody(request, LIMIT);
  assert.ok(result instanceof Request);
  assert.equal(result.headers.has("Content-Length"), false);
  assert.equal(await result.text(), "safe");
});
