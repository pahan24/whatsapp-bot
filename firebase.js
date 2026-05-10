const admin = require('firebase-admin');
require('dotenv').config();

let db = null;
let firebaseHealthy = true;
const DB_ENABLED = process.env.FIREBASE_ENABLED === 'true';
const fakeDB = {
  users: {},
  coins: {},
  settings: {},
  channels: {},
  autoreplies: {},
  groups: {},
  webpass: {},
  meta: { userCount: 0 },
  sessionBackup: {},
};

const initFirebase = () => {
  if (!DB_ENABLED) {
    console.log('ℹ️ Firebase disabled by FIREBASE_ENABLED=false. Running with in-memory fallback only.');
    firebaseHealthy = false;
    return;
  }
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey || !databaseURL) {
      firebaseHealthy = false;
      console.warn('⚠️  Firebase not initialized: missing required env vars.');
      console.warn('   Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL');
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      });
    }
    db = admin.database();
    console.log('✅ Firebase connected!');
  } catch (err) {
    console.warn('⚠️  Firebase not connected:', err.message);
    console.warn('   Bot will run without database features.');
  }
};

const clean = (jid) => jid?.replace(/[^0-9]/g, '') || '';
const validPath = (p) => typeof p === 'string' && p.length > 0;

const safeGet    = async (p) => {
  if (!db || !firebaseHealthy || !validPath(p)) return null;
  try {
    return (await db.ref(p).once('value')).val();
  } catch (err) {
    firebaseHealthy = false;
    console.warn(`⚠️ Firebase safeGet failed for path ${p}:`, err && err.message ? err.message : err);
    return null;
  }
};
const safeSet    = async (p, d) => {
  if (!db || !firebaseHealthy || !validPath(p)) return;
  try { await db.ref(p).set(d); } catch (err) { firebaseHealthy = false; console.warn(`⚠️ Firebase safeSet failed for path ${p}:`, err && err.message ? err.message : err); }
};
const safeUpdate = async (p, d) => {
  if (!db || !firebaseHealthy || !validPath(p)) return;
  try { await db.ref(p).update(d); } catch (err) { firebaseHealthy = false; console.warn(`⚠️ Firebase safeUpdate failed for path ${p}:`, err && err.message ? err.message : err); }
};
const safeRemove = async (p) => {
  if (!db || !firebaseHealthy || !validPath(p)) return;
  try { await db.ref(p).remove(); } catch (err) { firebaseHealthy = false; console.warn(`⚠️ Firebase safeRemove failed for path ${p}:`, err && err.message ? err.message : err); }
};

// ── Session (Heroku support) ──────────────────────────────────
const safeFirebaseKey = (name) => {
  if (typeof name !== 'string') return '';
  return encodeURIComponent(name).replace(/\./g, '%2E');
};
const decodeFirebaseKey = (key) => {
  if (typeof key !== 'string') return key;
  return decodeURIComponent(key);
};

const SESSION_BACKUP_PATH = 'session_backup/sasa_md';

const saveSessionToFirebase = async (sessionData) => {
  if (!DB_ENABLED || !firebaseHealthy) {
    fakeDB.sessionBackup = {};
    for (const [filename, content] of Object.entries(sessionData || {})) {
      const key = safeFirebaseKey(filename);
      if (key) fakeDB.sessionBackup[key] = content;
    }
    return;
  }
  const saved = {};
  for (const [filename, content] of Object.entries(sessionData || {})) {
    const key = safeFirebaseKey(filename);
    if (key) saved[key] = content;
  }
  await safeSet(SESSION_BACKUP_PATH, saved);
};
const getSessionFromFirebase = async () => {
  if (!DB_ENABLED || !firebaseHealthy) {
    const data = fakeDB.sessionBackup;
    if (!data) return null;
    return Object.entries(data).reduce((acc, [key, content]) => {
      const filename = decodeFirebaseKey(key);
      if (filename) acc[filename] = content;
      return acc;
    }, {});
  }
  const data = await safeGet(SESSION_BACKUP_PATH);
  if (!data) return null;
  if (typeof data === 'object' && !Array.isArray(data)) {
    return Object.entries(data).reduce((acc, [key, content]) => {
      const filename = decodeFirebaseKey(key);
      acc[filename] = content;
      return acc;
    }, {});
  }
  return null;
};

const incrementCounter = async (path, delta = 1) => {
  if (!db || !validPath(path)) return;
  try {
    await db.ref(path).transaction((current) => {
      const value = Number(current) || 0;
      return value + delta;
    });
  } catch (err) {
    console.warn(`⚠️ Firebase transaction failed for path ${path}:`, err.message);
  }
};

// ── Users ─────────────────────────────────────────────────────
const getUser          = (jid) => DB_ENABLED ? safeGet(`users/${clean(jid)}`) : Promise.resolve(fakeDB.users[clean(jid)] || null);
const saveUser         = (jid, d) => DB_ENABLED ? safeUpdate(`users/${clean(jid)}`, { ...d, lastSeen: Date.now() }) : Promise.resolve(fakeDB.users[clean(jid)] = { ...fakeDB.users[clean(jid)], ...d, lastSeen: Date.now() });
const isKnownNumber    = async (jid) => {
  if (DB_ENABLED) return !!(await safeGet(`users/${clean(jid)}/firstSeen`));
  return !!fakeDB.users[clean(jid)];
};
const markFirstContact = async (jid, name) => {
  if (!DB_ENABLED) {
    const key = clean(jid);
    if (!fakeDB.users[key]) {
      fakeDB.users[key] = { jid, name, firstSeen: Date.now(), lastSeen: Date.now() };
      fakeDB.meta.userCount += 1;
    } else {
      fakeDB.users[key] = { ...fakeDB.users[key], jid, name, lastSeen: Date.now() };
    }
    return;
  }
  const firstSeen = await safeGet(`users/${clean(jid)}/firstSeen`);
  if (!firstSeen) {
    await safeSet(`users/${clean(jid)}`, { jid, name, firstSeen: Date.now(), lastSeen: Date.now() });
    await incrementCounter('meta/userCount', 1);
  } else {
    await safeUpdate(`users/${clean(jid)}`, { jid, name, lastSeen: Date.now() });
  }
};
const getUserCount    = async () => {
  if (!DB_ENABLED) return fakeDB.meta.userCount;
  const count = await safeGet('meta/userCount');
  return Number(count) || 0;
};

// ── Inbox ─────────────────────────────────────────────────────
const saveInboxMsg = (jid, message, name) => {
  if (!DB_ENABLED) return Promise.resolve();
  return safeSet(`inbox/${clean(jid)}/${Date.now()}`, { jid, name, message, time: Date.now(), read: false });
};

// ── Coins ─────────────────────────────────────────────────────
const getCoins    = async (jid) => {
  const key = clean(jid);
  if (!DB_ENABLED) return fakeDB.coins[key] || { balance: 0, spent: 0, claimedDaily: null };
  return (await safeGet(`coins/${key}`)) || { balance: 0, spent: 0, claimedDaily: null };
};
const updateCoins = (jid, d) => {
  const key = clean(jid);
  if (!DB_ENABLED) {
    fakeDB.coins[key] = { ...fakeDB.coins[key], ...d };
    return Promise.resolve();
  }
  return safeUpdate(`coins/${key}`, d);
};
const addCoins    = async (jid, amount) => {
  const d = await getCoins(jid);
  await updateCoins(jid, { balance: (d.balance || 0) + amount });
};

// ── Channels ──────────────────────────────────────────────────
const getChannelList  = async () => DB_ENABLED ? (await safeGet('channels')) || {} : fakeDB.channels;
const addChannel      = (link, name) => {
  const id = link.split('/').pop();
  if (!DB_ENABLED) { fakeDB.channels[id] = { link, name, active: true, addedAt: Date.now() }; return Promise.resolve(); }
  return safeSet(`channels/${id}`, { link, name, active: true, addedAt: Date.now() });
};
const removeChannel   = (id) => DB_ENABLED ? safeRemove(`channels/${id}`) : Promise.resolve(delete fakeDB.channels[id]);
const logChannelReact = async (jid, channelId, coins) => {
  if (!DB_ENABLED) {
    await addCoins(jid, coins);
    return;
  }
  await safeSet(`reactions/${channelId}/${clean(jid)}/${Date.now()}`, { jid, coins, time: Date.now() });
  await addCoins(jid, coins);
};

const getUsers = async () => DB_ENABLED ? (await safeGet('users')) || {} : fakeDB.users;

// ── Ban / Sudo ────────────────────────────────────────────────
const isBanned   = async (jid) => !!(await safeGet(`banned/${clean(jid)}`));
const banUser    = (jid, reason = 'No reason') => safeSet(`banned/${clean(jid)}`, { jid, reason, time: Date.now() });
const unbanUser  = (jid) => safeRemove(`banned/${clean(jid)}`);
const isSudo     = async (jid) => !!(await safeGet(`sudo/${clean(jid)}`));
const addSudo    = (jid) => safeSet(`sudo/${clean(jid)}`, { jid, time: Date.now() });
const removeSudo = (jid) => safeRemove(`sudo/${clean(jid)}`);

// ── Settings ──────────────────────────────────────────────────
const getSettings = async () => DB_ENABLED ? (await safeGet('settings')) || {} : fakeDB.settings;
const setSetting  = (key, val) => {
  if (!DB_ENABLED) {
    fakeDB.settings[key] = val; return Promise.resolve();
  }
  return safeSet(`settings/${key}`, val);
};

// ── Auto replies ──────────────────────────────────────────────
const getRules   = async () => DB_ENABLED ? (await safeGet('autoreplies')) || {} : fakeDB.autoreplies;
const addRule    = (keyword, reply, type = 'TEXT') => {
  if (!DB_ENABLED) {
    const id = Date.now().toString(); fakeDB.autoreplies[id] = { keyword, reply, type, active: true, created: Date.now() }; return Promise.resolve();
  }
  return safeSet(`autoreplies/${Date.now()}`, { keyword, reply, type, active: true, created: Date.now() });
};
const deleteRule = (id) => DB_ENABLED ? safeRemove(`autoreplies/${id}`) : Promise.resolve(delete fakeDB.autoreplies[id]);

// ── Groups ────────────────────────────────────────────────────
const saveGroup   = (gid, d) => DB_ENABLED ? safeUpdate(`groups/${gid.replace('@', '_')}`, { ...d, updated: Date.now() }) : Promise.resolve(fakeDB.groups[gid.replace('@', '_')] = { ...fakeDB.groups[gid.replace('@', '_')], ...d, updated: Date.now() });
const groupBan    = (gid, jid) => DB_ENABLED ? safeSet(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`, { jid, time: Date.now() }) : Promise.resolve(fakeDB.groups[gid.replace('@', '_')] = { ...fakeDB.groups[gid.replace('@', '_')], banned: { ...(fakeDB.groups[gid.replace('@', '_')]?.banned || {}), [clean(jid)]: { jid, time: Date.now() } } });
const groupUnban  = (gid, jid) => DB_ENABLED ? safeRemove(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`) : Promise.resolve(delete fakeDB.groups[gid.replace('@', '_')]?.banned?.[clean(jid)]);
const isGroupBanned = async (gid, jid) => {
  if (!DB_ENABLED) return !!fakeDB.groups[gid.replace('@', '_')]?.banned?.[clean(jid)];
  return !!(await safeGet(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`));
};

// ── Web password ──────────────────────────────────────────────
const saveWebPass = (jid, pass) => {
  if (!DB_ENABLED) { fakeDB.webpass[clean(jid)] = { pass, time: Date.now() }; return Promise.resolve(); }
  return safeSet(`webpass/${clean(jid)}`, { pass, time: Date.now() });
};
const getWebPass  = async (jid) => {
  if (!DB_ENABLED) return fakeDB.webpass[clean(jid)]?.pass;
  return (await safeGet(`webpass/${clean(jid)}`))?.pass;
};

module.exports = {
  initFirebase,
  saveSessionToFirebase, getSessionFromFirebase,
  getUser, saveUser, isKnownNumber, markFirstContact,
  saveInboxMsg,
  getCoins, updateCoins, addCoins,
  getChannelList, addChannel, removeChannel, logChannelReact,
  isBanned, banUser, unbanUser,
  isSudo, addSudo, removeSudo,
  getSettings, setSetting,
  getRules, addRule, deleteRule,
  saveGroup, groupBan, groupUnban, isGroupBanned,
  getUsers, getUserCount,
  saveWebPass, getWebPass,
};
