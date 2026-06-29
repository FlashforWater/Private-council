import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSession } from "../src/domain.js";
import { SessionStore } from "../src/sessionStore.js";

const input = {
  question: "Should I build the complete version now?",
  background: "The prototype works but needs persistence.",
  currentLeaning: "Build the real local full-stack version.",
  timeHorizon: "2 weeks",
  emotionalState: "Focused",
  constraints: "Keep API keys server-side"
};

test("server session store persists and updates sessions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "private-council-"));
  try {
    const store = new SessionStore(join(dir, "sessions.json"));
    const session = createSession(input).session;

    await store.upsert(session);
    assert.equal((await store.list()).length, 1);
    assert.equal((await store.get(session.id)).title, input.question);

    const updated = await store.update(session.id, (current) => ({
      ...current,
      title: "Updated decision"
    }));

    assert.equal(updated.title, "Updated decision");
    assert.equal((await store.get(session.id)).title, "Updated decision");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
