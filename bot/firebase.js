const admin = require('firebase-admin');
require('dotenv').config();

let db;

const initFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    db = admin.database();
    console.log('✅ Firebase connected!');
    return db;
  } catch (err) {
    console.error('❌ Firebase error:', err.message);
    process.exit(1);
  }
};

const getDb = () => db;

// ── USERS ────────────────────────────────
const getUser = async (jid) => {
  const snap = await db.ref(`users/${jid.replace(/[^0-9]/g, '')}`).once('value');
  return snap.val();
};
const saveUser = async (jid, data) =>
  db.ref(`users/${jid.replace(/[^0-9]/g, '')}`).update({ ...data, lastSeen: Date.now() });

// ── UNKNOWN INBOX SAVE ───────────────────
const saveUnknownMsg = async (jid, message, name) => {
  const key = `inbox/${jid.replace(/[^0-9]/g, '')}/${Date.now()}`;
  await db.ref(key).set({ jid, name, message, time: Date.now(), read: false });
};
const getInbox = async () => {
  const snap = await db.ref('inbox').once('value');
  return snap.val() || {};
};
const isKnownNumber = async (jid) => {
  const clean = jid.replace(/[^0-9]/g, '');
  const snap = await db.ref(`users/${clean}/firstSeen`).once('value');
  return snap.exists();
};
const markFirstContact = async (jid, name) => {
  const clean = jid.replace(/[^0-9]/g, '');
  await db.ref(`users/${clean}`).update({ jid, name, firstSeen: Date.now(), lastSeen: Date.now() });
};

// ── COINS ────────────────────────────────
const getCoins = async (jid) => {
  const snap = await db.ref(`coins/${jid.replace(/[^0-9]/g, '')}`).once('value');
  return snap.val() || { balance: 0, spent: 0, claimedDaily: null, claimedWelcome: false };
};
const updateCoins = async (jid, data) =>
  db.ref(`coins/${jid.replace(/[^0-9]/g, '')}`).update(data);
const addCoins = async (jid, amount) => {
  const data = await getCoins(jid);
  await updateCoins(jid, { balance: (data.balance || 0) + amount });
};

// ── CHANNEL REACT LIST ───────────────────
const getChannelList = async () => {
  const snap = await db.ref('channels').once('value');
  return snap.val() || {};
};
const addChannel = async (link, name) => {
  const id = link.split('/').pop();
  await db.ref(`channels/${id}`).set({ link, name, addedAt: Date.now(), active: true });
};
const removeChannel = async (id) => db.ref(`channels/${id}`).remove();
const logChannelReact = async (jid, channelId, coinsEarned) => {
  const key = `reactions/${channelId}/${jid.replace(/[^0-9]/g, '')}/${Date.now()}`;
  await db.ref(key).set({ jid, channelId, coinsEarned, time: Date.now() });
  await addCoins(jid, coinsEarned);
};

// ── BAN / SUDO ───────────────────────────
const isBanned = async (jid) => {
  const snap = await db.ref(`banned/${jid.replace(/[^0-9]/g, '')}`).once('value');
  return snap.exists();
};
const banUser = async (jid, reason = 'No reason') =>
  db.ref(`banned/${jid.replace(/[^0-9]/g, '')}`).set({ jid, reason, time: Date.now() });
const unbanUser = async (jid) => db.ref(`banned/${jid.replace(/[^0-9]/g, '')}`).remove();
const isSudo = async (jid) => {
  const snap = await db.ref(`sudo/${jid.replace(/[^0-9]/g, '')}`).once('value');
  return snap.exists();
};
const addSudo = async (jid) => db.ref(`sudo/${jid.replace(/[^0-9]/g, '')}`).set({ jid, time: Date.now() });
const removeSudo = async (jid) => db.ref(`sudo/${jid.replace(/[^0-9]/g, '')}`).remove();

// ── SETTINGS ─────────────────────────────
const getSettings = async () => {
  const snap = await db.ref('settings').once('value');
  return snap.val() || {};
};
const setSetting = async (key, value) => db.ref(`settings/${key}`).set(value);

// ── AUTO REPLY RULES ─────────────────────
const getRules = async () => {
  const snap = await db.ref('autoreplies').once('value');
  return snap.val() || {};
};
const addRule = async (keyword, reply, type = 'TEXT') => {
  const id = Date.now().toString();
  await db.ref(`autoreplies/${id}`).set({ keyword, reply, type, active: true, created: Date.now() });
};
const deleteRule = async (id) => db.ref(`autoreplies/${id}`).remove();

// ── GROUPS ───────────────────────────────
const saveGroup = async (groupId, data) =>
  db.ref(`groups/${groupId.replace('@', '_')}`).update({ ...data, lastSeen: Date.now() });

// ── WEB PASSWORD ─────────────────────────
const generateWebPass = (number) => {
  const seed = number.replace(/\D/g, '');
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pw = 'RQ';
  let h = hash;
  for (let i = 0; i < 6; i++) { pw += chars[h % chars.length]; h = Math.floor(h / chars.length) || hash + i + 1; }
  return pw;
};

const saveWebPass = async (jid, pass) => db.ref(`webpass/${jid.replace(/[^0-9]/g, '')}`).set({ pass, time: Date.now() });
const getWebPass = async (jid) => {
  const snap = await db.ref(`webpass/${jid.replace(/[^0-9]/g, '')}`).once('value');
  return snap.val()?.pass;
};

module.exports = {
  initFirebase, getDb,
  getUser, saveUser,
  saveUnknownMsg, getInbox, isKnownNumber, markFirstContact,
  getCoins, updateCoins, addCoins,
  getChannelList, addChannel, removeChannel, logChannelReact,
  isBanned, banUser, unbanUser,
  isSudo, addSudo, removeSudo,
  getSettings, setSetting,
  getRules, addRule, deleteRule,
  saveGroup,
  generateWebPass, saveWebPass, getWebPass,
};
