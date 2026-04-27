import { loadDb, saveDb, nextId } from "./store.js";

export function registerUser({ name, email, password }) {
  const db = loadDb();
  const normalized = email.trim().toLowerCase();
  if (db.users.some((u) => u.email === normalized)) {
    throw new Error("该邮箱已注册");
  }
  const user = {
    id: nextId("u"),
    name: name.trim(),
    email: normalized,
    passwordHash: password,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  db.sessions.currentUserId = user.id;
  saveDb(db);
  return user;
}

export function loginUser({ email, password }) {
  const db = loadDb();
  const normalized = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalized);
  if (!user || user.passwordHash !== password) {
    throw new Error("邮箱或密码错误");
  }
  db.sessions.currentUserId = user.id;
  saveDb(db);
  return user;
}

export function logoutUser() {
  const db = loadDb();
  db.sessions.currentUserId = null;
  saveDb(db);
}

export function getCurrentUser() {
  const db = loadDb();
  return db.users.find((u) => u.id === db.sessions.currentUserId) || null;
}
