const STORAGE_KEY = "private-council:sessions:v1";

export function loadSessions(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function upsertSession(session, storage = localStorage) {
  const sessions = loadSessions(storage);
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  saveSessions(sessions, storage);
  return sessions;
}

export function clearSessions(storage = localStorage) {
  storage.removeItem(STORAGE_KEY);
}
