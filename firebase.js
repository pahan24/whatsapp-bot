const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

const initFirebase = () => {
  const missing = [];
  if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
  if (!process.env.FIREBASE_DATABASE_URL) missing.push('FIREBASE_DATABASE_URL');
  if (missing.length) {
    console.warn('⚠️ Firebase not connected: missing environment variables', missing.join(', '));
    console.warn('   Bot will run without database features.');
    return;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    db = admin.database();
    console.log('✅ Firebase connected!');
  } catch (err) {
    console.warn('⚠️ Firebase not connected:', err.message);
    console.warn('   Bot will run without database features.');
    db = null;
  }
};

const getDb = () => db;

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
  initFirebase, getDb,
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
  registerBot: null, updateBotStatus: null, getBots: null,
  getUsers: null, addCoinsAdmin: null, getTotalStats: null,
};

// ─── Admin functions ──────────────────────────────────────────
const registerBot = async (number, data) => {
  const clean = number.replace(/\D/g, '');
  await safeUpdate(`bots/${clean}`, { ...data, number: clean, updatedAt: Date.now() });
  // update active count
  const bots = await safeGet('bots') || {};
  const activeCount = Object.values(bots).filter(b => b.status === 'active').length + 1;
  await safeSet('stats/activeBots', activeCount);
};

const updateBotStatus = async (id, status) => {
  await safeUpdate(`bots/${id}`, { status, updatedAt: Date.now() });
};

const getBots = async () => {
  const data = await safeGet('bots') || {};
  return Object.entries(data).map(([id, v]) => ({ id, ...v }));
};

const getUsers = async () => {
  const users = await safeGet('users') || {};
  const coins = await safeGet('coins') || {};
  return Object.entries(users).map(([id, u]) => ({
    id, ...u,
    balance: coins[id]?.balance || 0,
    spent:   coins[id]?.spent   || 0,
  }));
};

const addCoinsAdmin = async (number, amount, action = 'add') => {
  const clean = number.replace(/\D/g, '');
  const jid   = `${clean}@s.whatsapp.net`;
  const data  = await getCoins(jid);
  const newBal = action === 'add'
    ? (data.balance || 0) + amount
    : Math.max(0, (data.balance || 0) - amount);
  await updateCoins(jid, { balance: newBal });
  return { number: clean, balance: newBal, action, amount };
};

const getTotalStats = async () => {
  const [users, bots, inbox, coins, stats] = await Promise.all([
    safeGet('users'), safeGet('bots'), safeGet('inbox'),
    safeGet('coins'), safeGet('stats'),
  ]);
  const userList  = Object.values(users  || {});
  const botList   = Object.values(bots   || {});
  const coinList  = Object.values(coins  || {});
  const inboxList = Object.values(inbox  || {});
  const totalCoins = coinList.reduce((s, u) => s + (u.balance || 0), 0);
  const activeBots = botList.filter(b => b.status === 'active').length;
  return {
    totalUsers:    userList.length,
    activeBots,
    totalBots:     botList.length,
    totalInbox:    inboxList.length,
    totalCoins,
    stats:         stats || {},
  };
};


// Assign admin functions to exports
module.exports.registerBot    = registerBot;
module.exports.updateBotStatus = updateBotStatus;
module.exports.getBots         = getBots;
module.exports.getUsers        = getUsers;
module.exports.addCoinsAdmin   = addCoinsAdmin;
module.exports.getTotalStats   = getTotalStats;
