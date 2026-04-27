import { loadDb, saveDb, nextId } from "./store.js";

function requireCurrentUser() {
  const db = loadDb();
  const userId = db.sessions.currentUserId;
  if (!userId) throw new Error("请先登录");
  return { db, userId };
}

function makeInviteCode(db) {
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (db.families.some((f) => f.inviteCode === code));
  return code;
}

export function createFamilyGroup(name) {
  const { db, userId } = requireCurrentUser();
  const created = db.families.find((f) => f.createdBy === userId);
  if (created) throw new Error("每个用户只能创建一个家庭组");
  const family = {
    id: nextId("f"),
    name: name.trim(),
    inviteCode: makeInviteCode(db),
    createdBy: userId,
  };
  db.families.push(family);
  db.familyMembers.push({
    id: nextId("fm"),
    familyId: family.id,
    userId,
    role: "parent",
  });
  saveDb(db);
  return family;
}

export function joinFamilyByCode(inviteCode, role) {
  const { db, userId } = requireCurrentUser();
  const code = inviteCode.trim().toUpperCase();
  const family = db.families.find((f) => f.inviteCode === code);
  if (!family) throw new Error("邀请码不存在");
  if (role === "child") {
    const hasChildMembership = db.familyMembers.some((m) => m.userId === userId && m.role === "child");
    if (hasChildMembership) throw new Error("孩子账号只能加入一个家庭组");
  }
  const exists = db.familyMembers.find((m) => m.familyId === family.id && m.userId === userId);
  if (exists) throw new Error("你已经在这个家庭组中");
  db.familyMembers.push({
    id: nextId("fm"),
    familyId: family.id,
    userId,
    role,
  });
  saveDb(db);
  return family;
}

export function getMyFamilies() {
  const { db, userId } = requireCurrentUser();
  const memberships = db.familyMembers.filter((m) => m.userId === userId);
  return memberships.map((m) => {
    const family = db.families.find((f) => f.id === m.familyId);
    if (!family) return null;
    const members = db.familyMembers
      .filter((x) => x.familyId === m.familyId)
      .map((x) => {
        const u = db.users.find((i) => i.id === x.userId);
        return { userId: x.userId, name: u ? u.name : "未知", role: x.role };
      });
    return {
      id: family.id,
      name: family.name,
      inviteCode: family.inviteCode,
      myRole: m.role,
      canManage: family.createdBy === userId,
      members,
    };
  }).filter(Boolean);
}

export function seedStudyData() {
  const { db, userId } = requireCurrentUser();
  const familyIds = db.familyMembers.filter((m) => m.userId === userId).map((m) => m.familyId);
  const relatedUsers = new Set();
  db.familyMembers.forEach((m) => {
    if (familyIds.includes(m.familyId)) relatedUsers.add(m.userId);
  });
  relatedUsers.forEach((uid) => {
    if (!db.studyData.find((s) => s.userId === uid)) {
      db.studyData.push({
        id: nextId("s"),
        userId: uid,
        games: Math.floor(Math.random() * 40) + 10,
        reviewRate: Math.floor(Math.random() * 40) + 50,
        trainingRate: Math.floor(Math.random() * 50) + 40,
        blunderRate: Math.floor(Math.random() * 15) + 10,
      });
    }
  });
  saveDb(db);
}

export function canViewUserData(viewerId, targetUserId) {
  if (viewerId === targetUserId) return true;
  const db = loadDb();
  const sharedFamilyIds = db.familyMembers
    .filter((m) => m.userId === viewerId)
    .map((m) => m.familyId)
    .filter((fid) => db.familyMembers.some((x) => x.familyId === fid && x.userId === targetUserId));

  if (sharedFamilyIds.length === 0) return false;

  const viewerRole = db.familyMembers.find(
    (m) => m.userId === viewerId && sharedFamilyIds.includes(m.familyId),
  )?.role;
  const targetRole = db.familyMembers.find(
    (m) => m.userId === targetUserId && sharedFamilyIds.includes(m.familyId),
  )?.role;

  if (viewerRole === "parent" && targetRole === "child") return true;
  return false;
}

export function getUserStudyData(targetUserId) {
  const { db, userId } = requireCurrentUser();
  if (!canViewUserData(userId, targetUserId)) {
    throw new Error("无权限查看该用户数据");
  }
  const targetUser = db.users.find((u) => u.id === targetUserId);
  const data = db.studyData.find((s) => s.userId === targetUserId);
  if (!targetUser || !data) throw new Error("目标数据不存在");
  return {
    name: targetUser.name,
    ...data,
  };
}

export function getCurrentUserId() {
  const { userId } = requireCurrentUser();
  return userId;
}

function requireFamilyOwner(db, userId, familyId) {
  const family = db.families.find((f) => f.id === familyId);
  if (!family) throw new Error("家庭组不存在");
  if (family.createdBy !== userId) throw new Error("只有家庭组创建者可以执行此操作");
  return family;
}

export function updateFamilyName(familyId, newName) {
  const { db, userId } = requireCurrentUser();
  const family = requireFamilyOwner(db, userId, familyId);
  const name = (newName || "").trim();
  if (!name) throw new Error("家庭组名称不能为空");
  family.name = name;
  saveDb(db);
  return family;
}

export function regenerateFamilyInviteCode(familyId) {
  const { db, userId } = requireCurrentUser();
  const family = requireFamilyOwner(db, userId, familyId);
  family.inviteCode = makeInviteCode(db);
  saveDb(db);
  return family;
}

export function dissolveFamilyGroup(familyId) {
  const { db, userId } = requireCurrentUser();
  requireFamilyOwner(db, userId, familyId);
  db.familyMembers = db.familyMembers.filter((m) => m.familyId !== familyId);
  db.families = db.families.filter((f) => f.id !== familyId);
  saveDb(db);
}
