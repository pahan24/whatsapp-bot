const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const {
  initFirebase,
  isBanned,
  isKnownNumber, markFirstContact, saveInboxMsg,
  getSettings,
} = require('./firebase');
const config = require('./config');

// ── Command handlers ──────────────────────────────────────────
const menuCmd      = require('./commands/menu');
const ownerCmd     = require('./commands/owner');
const toolsCmd     = require('./commands/tools');
const socialCmd    = require('./commands/social');
const groupCmd     = require('./commands/group');
const channelCmd   = require('./commands/channel');
const educationCmd = require('./commands/education');
const { handleChannelMessage } = require('./commands/channel');

const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;

// ── Command routing table ─────────────────────────────────────
const CMD_MAP = {
  // menu
  menu: menuCmd,
  // owner
  privacy: ownerCmd, setting: ownerCmd, getdp: ownerCmd,
  setsudo: ownerCmd, delsudo: ownerCmd, setcall: ownerCmd,
  delcall: ownerCmd, ban: ownerCmd, unban: ownerCmd,
  getpass: ownerCmd, setprefix: ownerCmd,
  broadcast: ownerCmd, restart: ownerCmd, shutdown: ownerCmd,
  // tools
  ping: toolsCmd, alive: toolsCmd, system: toolsCmd,
  bot: toolsCmd, calc: toolsCmd, sticker: toolsCmd, toimg: toolsCmd,
  // social
  song: socialCmd, video: socialCmd, fb: socialCmd,
  tiktok: socialCmd, insta: socialCmd, twitter: socialCmd,
  movie: socialCmd, apk: socialCmd, img: socialCmd,
  // group
  add: groupCmd, kick: groupCmd, promote: groupCmd, demote: groupCmd,
  del: groupCmd, tagadmins: groupCmd, tagall: groupCmd, hidetag: groupCmd,
  ginfo: groupCmd, glink: groupCmd, grlink: groupCmd, gname: groupCmd,
  gdec: groupCmd, gdp: groupCmd, grdp: groupCmd,
  lock: groupCmd, unlock: groupCmd, close: groupCmd, open: groupCmd,
  join: groupCmd, left: groupCmd, gdisappearing: groupCmd,
  pin: groupCmd, gsave: groupCmd, gban: groupCmd, gunban: groupCmd,
  // channel / coins
  chanel: channelCmd, addchanel: channelCmd, delchanel: channelCmd,
  react: channelCmd, coins: channelCmd, daily: channelCmd,
  transfer: channelCmd, leaderboard: channelCmd,
  // education
  paper: educationCmd, wiki: educationCmd, define: educationCmd,
  joke: educationCmd, quote: educationCmd, news: educationCmd,
};

// ── Number reply map (1-7 → menu submenus) ───────────────────
const NUM_CMDS = new Set(['1','2','3','4','5','6','7']);

// ── Unknown sender handler ────────────────────────────────────
const handleUnknownSender = async (sock, msg, sender, pushName) => {
  try {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '[Media/Non-text message]';

    const known = await isKnownNumber(sender);

    if (!known) {
      // Mark as known & send Sinhala auto-reply
      await markFirstContact(sender, pushName || 'Unknown');
      await sock.sendMessage(sender, { text: config.unknownMsg(pushName || 'User') });
    }

    // Save every DM to inbox
    await saveInboxMsg(sender, text, pushName || 'Unknown');

    // Notify owner
    const num = sender.replace(/\D/g, '');
    await sock.sendMessage(OWNER_JID, {
      text:
`📩 *${known ? 'Message' : 'New unknown number message'}*

👤 Name: ${pushName || 'Unknown'}
📱 Number: +${num}
${!known ? '🆕 First contact!\n' : ''}
💬 Message:
${text}

> Saved to inbox ✅`,
    });
  } catch (err) {
    console.error('Unknown handler error:', err.message);
  }
};

// ── Bot start ─────────────────────────────────────────────────
const startBot = async () => {
  initFirebase();

  const sessionPath = path.join(__dirname, 'sessions', config.sessionId);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: true,
    browser: ['SASA MD', 'Chrome', '5.2.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Connection ────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`🔴 Connection closed (code ${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(startBot, 4000);
    } else if (connection === 'open') {
      console.log(`\n✅ SASA MD v${config.version} — Online!`);
      console.log(`👑 Owner: ${config.ownerNumber}\n`);
      // Send Sinhala connect message with web password
      const pass = config.getOwnerPass();
      try {
        await sock.sendMessage(OWNER_JID, { text: config.connectMsg(pass) });
      } catch (e) { console.error('Could not send connect msg:', e.message); }
    }
  });

  // ── Call block ────────────────────────────────────────────
  sock.ev.on('call', async (calls) => {
    const settings = await getSettings();
    if (!settings.callReject) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, { text: '❌ Calls are blocked!' });
        } catch {}
      }
    }
  });

  // ── Messages ──────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;

        const from    = msg.key.remoteJid;
        const sender  = msg.key.participant || msg.key.remoteJid;
        const name    = msg.pushName || 'User';
        const isGroup = from.endsWith('@g.us');

        // Channel newsletter auto-react
        if (from?.includes('@newsletter')) {
          await handleChannelMessage(sock, msg);
          continue;
        }

        // Auto read
        if (config.autoRead) {
          try { await sock.readMessages([msg.key]); } catch {}
        }

        // Ban check
        if (await isBanned(sender)) continue;

        // Unknown number DM handler (not owner, not group)
        if (!isGroup && sender !== OWNER_JID) {
          await handleUnknownSender(sock, msg, sender, name);
        }

        // Extract command
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption || '';

        if (!body.startsWith(config.prefix)) {
          // Check if it's a numbered menu reply (1-7)
          if (NUM_CMDS.has(body.trim())) {
            await menuCmd(sock, msg, [], body.trim());
          }
          continue;
        }

        const parts   = body.slice(config.prefix.length).trim().split(/\s+/);
        const command = parts.shift()?.toLowerCase();
        const args    = parts;
        if (!command) continue;

        // Auto typing
        if (config.autoTyping) {
          try {
            await sock.sendPresenceUpdate('composing', from);
            setTimeout(() => sock.sendPresenceUpdate('paused', from).catch(() => {}), 2000);
          } catch {}
        }

        // Route command
        const handler = CMD_MAP[command];
        if (handler) {
          await handler(sock, msg, args, command);
        } else {
          // Unknown command — silent ignore (don't spam)
          console.log(`Unknown command: ${config.prefix}${command}`);
        }

      } catch (err) {
        console.error('❌ Message error:', err.message);
      }
    }
  });

  // ── Group participant updates ─────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      if (action === 'add') {
        for (const jid of participants) {
          await sock.sendMessage(id, {
            text:
`👋 *Welcome to the group!*

🤖 This group is managed by *SASA MD Bot*
⚡ Type *${config.prefix}menu* to see all commands

> _Powered by SASA MD_`,
          });
        }
      }
    } catch {}
  });

  return sock;
};

startBot();
