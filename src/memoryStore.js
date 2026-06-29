import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class MemoryStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async list() {
    const memories = await this.#readAll();
    return memories.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }

  async add(memory) {
    const memories = await this.#readAll();
    const next = {
      id: memory.id || makeId("memory"),
      type: memory.type || "decision_memory",
      text: memory.text,
      sensitivity: memory.sensitivity || "medium",
      sourceSessionId: memory.sourceSessionId || "",
      savedAt: memory.savedAt || new Date().toISOString()
    };
    memories.push(next);
    await this.#writeAll(dedupe(memories));
    return next;
  }

  async remove(id) {
    const memories = await this.#readAll();
    const next = memories.filter((memory) => memory.id !== id);
    await this.#writeAll(next);
    return memories.length !== next.length;
  }

  async retrieveForText(text, limit = 5) {
    const queryTerms = terms(text);
    const memories = await this.#readAll();
    return memories
      .map((memory) => ({
        ...memory,
        relevance: score(queryTerms, terms(memory.text))
      }))
      .filter((memory) => memory.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  async #readAll() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.memories) ? parsed.memories : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async #writeAll(memories) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, JSON.stringify({ version: 1, memories }, null, 2), "utf8");
    await rename(tmpPath, this.filePath);
  }
}

function score(queryTerms, memoryTerms) {
  if (!queryTerms.length || !memoryTerms.length) return 0;
  const memorySet = new Set(memoryTerms);
  return queryTerms.filter((term) => memorySet.has(term)).length;
}

function terms(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3);
}

function dedupe(memories) {
  const seen = new Set();
  return memories.filter((memory) => {
    const key = `${memory.type}:${memory.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
