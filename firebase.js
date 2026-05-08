const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

const initFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
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

const safeGet    = async (p) => { if (!db) return null; try { return (await db.ref(p).once('value')).val(); } catch { return null; } };
const safeSet    = async (p, d) => { if (!db) return; try { await db.ref(p).set(d); } catch {} };
const safeUpdate = async (p, d) => { if (!db) return; try { await db.ref(p).update(d); } catch {} };
const safeRemove = async (p) => { if (!db) return; try { await db.ref(p).remove(); } catch {} };

// ── Session (Heroku support) ──────────────────────────────────
const saveSessionToFirebase = async (sessionData) => {
  if (!db) return;
  await safeSet('session/sasa_md', sessionData);
};
const getSessionFromFirebase = async () => safeGet('session/sasa_md');

// ── Users ─────────────────────────────────────────────────────
const getUser          = (jid) => safeGet(`users/${clean(jid)}`);
const saveUser         = (jid, d) => safeUpdate(`users/${clean(jid)}`, { ...d, lastSeen: Date.now() });
const isKnownNumber    = async (jid) => !!(await safeGet(`users/${clean(jid)}/firstSeen`));
const markFirstContact = (jid, name) => safeUpdate(`users/${clean(jid)}`, { jid, name, firstSeen: Date.now(), lastSeen: Date.now() });

// ── Inbox ─────────────────────────────────────────────────────
const saveInboxMsg = (jid, message, name) =>
  safeSet(`inbox/${clean(jid)}/${Date.now()}`, { jid, name, message, time: Date.now(), read: false });

// ── Coins ─────────────────────────────────────────────────────
const getCoins    = async (jid) => (await safeGet(`coins/${clean(jid)}`)) || { balance: 0, spent: 0, claimedDaily: null };
const updateCoins = (jid, d)    => safeUpdate(`coins/${clean(jid)}`, d);
const addCoins    = async (jid, amount) => {
  const d = await getCoins(jid);
  await updateCoins(jid, { balance: (d.balance || 0) + amount });
};

// ── Channels ──────────────────────────────────────────────────
const getChannelList  = async () => (await safeGet('channels')) || {};
const addChannel      = (link, name) => safeSet(`channels/${link.split('/').pop()}`, { link, name, active: true, addedAt: Date.now() });
const removeChannel   = (id) => safeRemove(`channels/${id}`);
const logChannelReact = async (jid, channelId, coins) => {
  await safeSet(`reactions/${channelId}/${clean(jid)}/${Date.now()}`, { jid, coins, time: Date.now() });
  await addCoins(jid, coins);
};

// ── Ban / Sudo ────────────────────────────────────────────────
const isBanned   = async (jid) => !!(await safeGet(`banned/${clean(jid)}`));
const banUser    = (jid, reason = 'No reason') => safeSet(`banned/${clean(jid)}`, { jid, reason, time: Date.now() });
const unbanUser  = (jid) => safeRemove(`banned/${clean(jid)}`);
const isSudo     = async (jid) => !!(await safeGet(`sudo/${clean(jid)}`));
const addSudo    = (jid) => safeSet(`sudo/${clean(jid)}`, { jid, time: Date.now() });
const removeSudo = (jid) => safeRemove(`sudo/${clean(jid)}`);

// ── Settings ──────────────────────────────────────────────────
const getSettings = async () => (await safeGet('settings')) || {};
const setSetting  = (key, val) => safeSet(`settings/${key}`, val);

// ── Auto replies ──────────────────────────────────────────────
const getRules   = async () => (await safeGet('autoreplies')) || {};
const addRule    = (keyword, reply, type = 'TEXT') =>
  safeSet(`autoreplies/${Date.now()}`, { keyword, reply, type, active: true, created: Date.now() });
const deleteRule = (id) => safeRemove(`autoreplies/${id}`);

// ── Groups ────────────────────────────────────────────────────
const saveGroup   = (gid, d) => safeUpdate(`groups/${gid.replace('@', '_')}`, { ...d, updated: Date.now() });
const groupBan    = (gid, jid) => safeSet(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`, { jid, time: Date.now() });
const groupUnban  = (gid, jid) => safeRemove(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`);
const isGroupBanned = async (gid, jid) => !!(await safeGet(`groups/${gid.replace('@', '_')}/banned/${clean(jid)}`));

// ── Web password ──────────────────────────────────────────────
const saveWebPass = (jid, pass) => safeSet(`webpass/${clean(jid)}`, { pass, time: Date.now() });
const getWebPass  = async (jid) => (await safeGet(`webpass/${clean(jid)}`))?.pass;

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
  saveWebPass, getWebPass,
};
