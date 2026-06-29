import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryStore } from "../src/memoryStore.js";

test("memory store persists, retrieves relevant memory, and deletes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "private-council-memory-"));
  try {
    const store = new MemoryStore(join(dir, "memory.json"));
    const memory = await store.add({
      type: "user_preference",
      text: "User values reversibility in product decisions.",
      sensitivity: "low",
      sourceSessionId: "session_1"
    });

    assert.equal((await store.list()).length, 1);

    const retrieved = await store.retrieveForText("product decision with reversibility", 3);
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].id, memory.id);

    assert.equal(await store.remove(memory.id), true);
    assert.equal((await store.list()).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
