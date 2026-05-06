const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const {
  initFirebase, isBanned, isKnownNumber, markFirstContact,
  saveUnknownMsg, generateWebPass, saveWebPass, getSettings,
} = require('./firebase');
const config = require('./config');

// Commands
const menuCmd = require('./commands/menu');
const channelCmd = require('./commands/channel');
const { handleChannelMessage } = require('./commands/channel');

// Lazy-load other command files
const loadCmd = (name) => { try { return require(`./commands/${name}`); } catch { return null; } };

const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;

// ── GENERATE & SEND WEB PASSWORD ───────────────────────────────
const sendConnectMessage = async (sock) => {
  const pass = generateWebPass(config.ownerNumber);
  await saveWebPass(OWNER_JID, pass);
  const msg = config.connectMsg(pass);
  await sock.sendMessage(OWNER_JID, { text: msg });
  console.log(`🔐 Web password sent: ${pass}`);
};

// ── HANDLE UNKNOWN NUMBER AUTO-REPLY + SAVE ────────────────────
const handleUnknownSender = async (sock, msg, sender, pushName) => {
  try {
    const isNew = !(await isKnownNumber(sender));
    const text = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || '[Media/Non-text message]';

    if (isNew) {
      // Mark as known
      await markFirstContact(sender, pushName || 'Unknown');
      // Send auto-reply
      await sock.sendMessage(sender, {
        text: config.unknownMsg(pushName || 'User', sender.replace(/[^0-9]/g, ''))
      });
    }
    // Always save the message
    await saveUnknownMsg(sender, text, pushName || 'Unknown');
    // Notify owner
    const num = sender.replace(/[^0-9]/g, '');
    await sock.sendMessage(OWNER_JID, {
      text: `📩 *New message from unknown number*\n\n👤 Name: ${pushName || 'Unknown'}\n📱 Number: +${num}\n\n💬 Message:\n${text}\n\n> Message saved to database.`
    });
    console.log(`📥 Unknown number message saved: +${num}`);
  } catch (err) {
    console.error('Unknown handler error:', err.message);
  }
};

// ── BOT START ──────────────────────────────────────────────────
const startBot = async () => {
  initFirebase();

  const sessionPath = path.join(__dirname, 'sessions', config.sessionId);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: true,
    browser: ['RED QUEEN MD', 'Chrome', '5.2.0'],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  // ── CONNECTION ────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔴 Connection closed. Reconnect:', shouldReconnect);
      if (shouldReconnect) setTimeout(startBot, 3000);
    } else if (connection === 'open') {
      console.log(`\n✅ RED QUEEN MD v${config.version} — Connected!`);
      console.log(`👑 Owner: ${config.ownerNumber}\n`);
      // Send Sinhala connect message with web password
      await sendConnectMessage(sock);
    }
  });

  // ── CALL BLOCK ────────────────────────────────
  sock.ev.on('call', async (calls) => {
    const settings = await getSettings();
    if (!settings.callReject) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        await sock.rejectCall(call.id, call.from);
        await sock.sendMessage(call.from, { text: '❌ Calls are blocked!' });
      }
    }
  });

  // ── MESSAGES ──────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || 'User';
        const isGroup = from.endsWith('@g.us');

        // ── Channel newsletter auto-react
        if (from.includes('newsletter') || from.includes('@newsletter')) {
          await handleChannelMessage(sock, msg);
          continue;
        }

        // Auto read
        if (config.autoRead) await sock.readMessages([msg.key]);

        // Ban check
        if (await isBanned(sender)) continue;

        // ── UNKNOWN NUMBER DETECTION (DM only)
        if (!isGroup && sender !== OWNER_JID) {
          const known = await isKnownNumber(sender);
          if (!known) {
            await handleUnknownSender(sock, msg, sender, pushName);
          } else {
            // Still save messages from known numbers to inbox
            const text = msg.message?.conversation
              || msg.message?.extendedTextMessage?.text
              || '[Media]';
            await saveUnknownMsg(sender, text, pushName);
          }
        }

        // ── EXTRACT COMMAND ────────────────────
        const body = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || msg.message?.videoMessage?.caption || '';

        if (!body.startsWith(config.prefix)) continue;

        const args = body.slice(config.prefix.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();
        if (!command) continue;

        // Auto typing
        if (config.autoTyping) {
          await sock.sendPresenceUpdate('composing', from);
          setTimeout(() => sock.sendPresenceUpdate('paused', from), 2000);
        }

        // ── ROUTE COMMANDS ─────────────────────
        const CHANNEL_CMDS = ['chanel', 'addchanel', 'delchanel', 'react', 'coins', 'daily', 'leaderboard', 'transfer'];
        const MENU_CMDS = ['menu'];

        if (MENU_CMDS.includes(command) || ['1','2','3','4','5','6','7'].includes(command)) {
          await menuCmd(sock, msg, args, command);
        } else if (CHANNEL_CMDS.includes(command)) {
          await channelCmd(sock, msg, args, command);
        } else {
          // Try loading other command modules
          const cmdMods = ['owner', 'social', 'group', 'tools', 'education'];
          for (const mod of cmdMods) {
            const handler = loadCmd(mod);
            if (handler) {
              try { await handler(sock, msg, args, command); } catch {}
            }
          }
        }

      } catch (err) {
        console.error('❌ Message handler error:', err.message);
      }
    }
  });
};

startBot();
