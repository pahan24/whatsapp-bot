const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

const initFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:    process.env.FIREBASE_PROJECT_ID,
          clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    db = admin.database();
    console.log('✅ Firebase connected!');
    return db;
  } catch (err) {
    console.error('❌ Firebase error:', err.message);
    // Continue without Firebase in demo mode
    return null;
  }
};

const getDb = () => db;

// ─── Safe DB helper ──────────────────────────────────────────
const safeGet = async (path) => {
  if (!db) return null;
  try {
    const snap = await db.ref(path).once('value');
    return snap.val();
  } catch { return null; }
};
const safeSet = async (path, data) => {
  if (!db) return;
  try { await db.ref(path).set(data); } catch {}
};
const safeUpdate = async (path, data) => {
  if (!db) return;
  try { await db.ref(path).update(data); } catch {}
};
const safeRemove = async (path) => {
  if (!db) return;
  try { await db.ref(path).remove(); } catch {}
};

// ─── Users ───────────────────────────────────────────────────
const cleanJid = (jid) => jid?.replace(/[^0-9]/g, '') || '';

const getUser      = (jid) => safeGet(`users/${cleanJid(jid)}`);
const saveUser     = (jid, data) => safeUpdate(`users/${cleanJid(jid)}`, { ...data, lastSeen: Date.now() });
const isKnownNumber = async (jid) => !!(await safeGet(`users/${cleanJid(jid)}/firstSeen`));
const markFirstContact = (jid, name) =>
  safeUpdate(`users/${cleanJid(jid)}`, { jid, name, firstSeen: Date.now(), lastSeen: Date.now() });

// ─── Inbox (unknown messages) ────────────────────────────────
const saveInboxMsg = (jid, message, name) =>
  safeSet(`inbox/${cleanJid(jid)}/${Date.now()}`, { jid, name, message, time: Date.now(), read: false });
const getInbox = () => safeGet('inbox');

// ─── Coins ───────────────────────────────────────────────────
const getCoins = async (jid) =>
  (await safeGet(`coins/${cleanJid(jid)}`)) || { balance: 0, spent: 0, claimedDaily: null, claimedWelcome: false };
const updateCoins = (jid, data) => safeUpdate(`coins/${cleanJid(jid)}`, data);
const addCoins    = async (jid, amount) => {
  const d = await getCoins(jid);
  await updateCoins(jid, { balance: (d.balance || 0) + amount });
};

// ─── Channel Reacts ──────────────────────────────────────────
const getChannelList  = () => safeGet('channels') || {};
const addChannel      = (link, name) => {
  const id = link.split('/').pop();
  return safeSet(`channels/${id}`, { link, name, id, addedAt: Date.now(), active: true });
};
const removeChannel   = (id) => safeRemove(`channels/${id}`);
const logChannelReact = async (jid, channelId, coins) => {
  await safeSet(`reactions/${channelId}/${cleanJid(jid)}/${Date.now()}`, { jid, channelId, coins, time: Date.now() });
  await addCoins(jid, coins);
};

// ─── Ban / Sudo ──────────────────────────────────────────────
const isBanned   = async (jid) => !!(await safeGet(`banned/${cleanJid(jid)}`));
const banUser    = (jid, reason='No reason') => safeSet(`banned/${cleanJid(jid)}`, { jid, reason, time: Date.now() });
const unbanUser  = (jid) => safeRemove(`banned/${cleanJid(jid)}`);
const isSudo     = async (jid) => !!(await safeGet(`sudo/${cleanJid(jid)}`));
const addSudo    = (jid) => safeSet(`sudo/${cleanJid(jid)}`, { jid, time: Date.now() });
const removeSudo = (jid) => safeRemove(`sudo/${cleanJid(jid)}`);

// ─── Settings ────────────────────────────────────────────────
const getSettings  = async () => (await safeGet('settings')) || {};
const setSetting   = (key, value) => safeSet(`settings/${key}`, value);

// ─── Auto Replies ────────────────────────────────────────────
const getRules    = async () => (await safeGet('autoreplies')) || {};
const addRule     = (keyword, reply, type='TEXT') => {
  const id = Date.now().toString();
  return safeSet(`autoreplies/${id}`, { keyword, reply, type, active: true, created: Date.now() });
};
const deleteRule  = (id) => safeRemove(`autoreplies/${id}`);

// ─── Groups ──────────────────────────────────────────────────
const saveGroup   = (groupId, data) => safeUpdate(`groups/${groupId.replace('@','_')}`, { ...data, updated: Date.now() });
const groupBan    = (groupId, jid) => safeSet(`groups/${groupId.replace('@','_')}/banned/${cleanJid(jid)}`, { jid, time: Date.now() });
const groupUnban  = (groupId, jid) => safeRemove(`groups/${groupId.replace('@','_')}/banned/${cleanJid(jid)}`);
const isGroupBanned = async (groupId, jid) => !!(await safeGet(`groups/${groupId.replace('@','_')}/banned/${cleanJid(jid)}`));

// ─── Web Password ────────────────────────────────────────────
const saveWebPass = (jid, pass) => safeSet(`webpass/${cleanJid(jid)}`, { pass, time: Date.now() });
const getWebPass  = async (jid) => (await safeGet(`webpass/${cleanJid(jid)}`))?.pass;

module.exports = {
  initFirebase, getDb,
  getUser, saveUser, isKnownNumber, markFirstContact,
  saveInboxMsg, getInbox,
  getCoins, updateCoins, addCoins,
  getChannelList, addChannel, removeChannel, logChannelReact,
  isBanned, banUser, unbanUser,
  isSudo, addSudo, removeSudo,
  getSettings, setSetting,
  getRules, addRule, deleteRule,
  saveGroup, groupBan, groupUnban, isGroupBanned,
  saveWebPass, getWebPass,
};
