import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class SessionStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async list() {
    const sessions = await this.#readAll();
    return sessions.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async get(id) {
    const sessions = await this.#readAll();
    return sessions.find((session) => session.id === id) || null;
  }

  async upsert(session) {
    const sessions = await this.#readAll();
    const index = sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    await this.#writeAll(sessions);
    return session;
  }

  async update(id, updater) {
    const current = await this.get(id);
    if (!current) return null;
    const next = await updater(current);
    await this.upsert(next);
    return next;
  }

  async #readAll() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.sessions) ? parsed.sessions : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async #writeAll(sessions) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(
      tmpPath,
      JSON.stringify({ version: 1, sessions }, null, 2),
      "utf8"
    );
    await rename(tmpPath, this.filePath);
  }
}
