const KEY = "chess_mvp_db_v1";
const CACHE_KEY = "chess_mvp_db_cache_v1";
const SESSION_KEY = "chess_mvp_session_v1";
const API_ENDPOINT = "/api/db";
const HEALTH_ENDPOINT = "/api/health";

function defaultDb() {
  return {
    users: [],
    families: [],
    familyMembers: [],
    studyData: [],
    games: [],
    reviews: [],
    battles: [],
  };
}

function defaultSession() {
  return { currentUserId: null };
}

function ensureSessionShape(session) {
  if (!session || typeof session !== "object") return defaultSession();
  return { currentUserId: session.currentUserId || null };
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

function normalizeDb(parsed) {
  const merged = { ...defaultDb(), ...(parsed || {}) };
  if (!Array.isArray(merged.users)) merged.users = [];
  if (!Array.isArray(merged.families)) merged.families = [];
  if (!Array.isArray(merged.familyMembers)) merged.familyMembers = [];
  if (!Array.isArray(merged.studyData)) merged.studyData = [];
  if (!Array.isArray(merged.games)) merged.games = [];
  if (!Array.isArray(merged.reviews)) merged.reviews = [];
  if (!Array.isArray(merged.battles)) merged.battles = [];
  return merged;
}

function readLocalSession() {
  const parsed = parseJson(localStorage.getItem(SESSION_KEY), defaultSession());
  return ensureSessionShape(parsed);
}

function writeLocalSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(ensureSessionShape(session)));
}

function toPersistedDb(db) {
  const normalized = normalizeDb(db);
  const payload = { ...normalized };
  delete payload.sessions;
  return payload;
}

function loadLegacyLocalDb() {
  const oldRaw = localStorage.getItem(KEY);
  if (!oldRaw) return null;
  const parsed = parseJson(oldRaw, null);
  if (!parsed || typeof parsed !== "object") return null;
  const merged = normalizeDb(parsed);
  if (parsed.sessions) {
    writeLocalSession(parsed.sessions);
  }
  localStorage.removeItem(KEY);
  localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
  return merged;
}

function readCacheDb() {
  const raw = localStorage.getItem(CACHE_KEY);
  const parsed = parseJson(raw, null);
  if (!parsed) return null;
  return normalizeDb(parsed);
}

function writeCacheDb(db) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(normalizeDb(db)));
}

function xhrJson(method, url, body = null) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, false);
  xhr.setRequestHeader("accept", "application/json");
  if (body) xhr.setRequestHeader("content-type", "application/json");
  xhr.send(body ? JSON.stringify(body) : null);
  if (xhr.status >= 200 && xhr.status < 300) {
    return parseJson(xhr.responseText, null);
  }
  throw new Error(`HTTP ${xhr.status}`);
}

function isApiReachable() {
  try {
    const result = xhrJson("GET", HEALTH_ENDPOINT);
    return Boolean(result && result.ok);
  } catch (_err) {
    return false;
  }
}

function attachSession(db) {
  return {
    ...normalizeDb(db),
    sessions: readLocalSession(),
  };
}

function getRemoteDb() {
  const remote = xhrJson("GET", API_ENDPOINT);
  return normalizeDb(remote);
}

function putRemoteDb(db) {
  const persisted = toPersistedDb(db);
  const saved = xhrJson("PUT", API_ENDPOINT, persisted);
  return normalizeDb(saved);
}

function shouldSeedRemoteFromLocal(remoteDb, localDb) {
  if (!localDb) return false;
  if ((remoteDb.users || []).length > 0) return false;
  const hasLocalData =
    (localDb.users || []).length ||
    (localDb.games || []).length ||
    (localDb.battles || []).length ||
    (localDb.families || []).length;
  return Boolean(hasLocalData);
}

export function loadDb() {
  const legacy = loadLegacyLocalDb();
  const localCache = legacy || readCacheDb();
  const reachable = isApiReachable();
  if (reachable) {
    let remoteDb = getRemoteDb();
    if (shouldSeedRemoteFromLocal(remoteDb, localCache)) {
      remoteDb = putRemoteDb(localCache);
    }
    writeCacheDb(remoteDb);
    return attachSession(remoteDb);
  }
  if (localCache) return attachSession(localCache);
  const fresh = defaultDb();
  writeCacheDb(fresh);
  return attachSession(fresh);
}

export function saveDb(db) {
  const session = ensureSessionShape(db.sessions);
  writeLocalSession(session);
  const payload = toPersistedDb(db);
  if (isApiReachable()) {
    const saved = putRemoteDb(payload);
    writeCacheDb(saved);
    return;
  }
  writeCacheDb(payload);
}

export function nextId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resetDb() {
  const fresh = defaultDb();
  saveDb(fresh);
  return fresh;
}
