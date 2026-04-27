const KEY = "chess_mvp_db_v1";

function defaultDb() {
  return {
    users: [],
    sessions: { currentUserId: null },
    families: [],
    familyMembers: [],
    studyData: [],
    games: [],
    reviews: [],
    battles: [],
  };
}

export function loadDb() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const fresh = defaultDb();
    saveDb(fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw);
    // Backward-compatible migration for older localStorage snapshots.
    const merged = {
      ...defaultDb(),
      ...parsed,
    };
    if (!Array.isArray(merged.users)) merged.users = [];
    if (!merged.sessions || typeof merged.sessions !== "object") {
      merged.sessions = { currentUserId: null };
    }
    if (!Array.isArray(merged.families)) merged.families = [];
    if (!Array.isArray(merged.familyMembers)) merged.familyMembers = [];
    if (!Array.isArray(merged.studyData)) merged.studyData = [];
    if (!Array.isArray(merged.games)) merged.games = [];
    if (!Array.isArray(merged.reviews)) merged.reviews = [];
    if (!Array.isArray(merged.battles)) merged.battles = [];
    // Persist migrated shape so subsequent reads are stable.
    saveDb(merged);
    return merged;
  } catch (_err) {
    const fresh = defaultDb();
    saveDb(fresh);
    return fresh;
  }
}

export function saveDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function nextId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resetDb() {
  const fresh = defaultDb();
  saveDb(fresh);
  return fresh;
}
