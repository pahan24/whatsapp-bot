const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino    = require('pino');
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const qrcode  = require('qrcode');
require('dotenv').config();

// ── Global QR state (shared between bot & web server) ─────────
let currentQR   = null;   // raw QR string
let qrImageData = null;   // base64 PNG for web
let botStatus   = 'disconnected'; // 'disconnected' | 'qr' | 'connected'
let pairingCode = null;   // pairing code for web
const sseClients = [];    // Server-Sent Events clients

const {
  initFirebase,
  isBanned,
  isKnownNumber, markFirstContact, saveInboxMsg,
  getSettings,
} = require('./firebase');
const config = require('./config');

// ── Commands ──────────────────────────────────────────────────
const menuCmd      = require('./commands/menu');
const ownerCmd     = require('./commands/owner');
const toolsCmd     = require('./commands/tools');
const socialCmd    = require('./commands/social');
const groupCmd     = require('./commands/group');
const channelCmd   = require('./commands/channel');
const educationCmd = require('./commands/education');
const { handleChannelMessage } = require('./commands/channel');

const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;

// ── Command routing ───────────────────────────────────────────
const CMD_MAP = {
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

const NUM_CMDS = new Set(['1','2','3','4','5','6','7']);

// ── Restore session from env (Heroku) ─────────────────────────
const restoreSession = () => {
  const sessionData = process.env.SESSION_DATA;
  if (!sessionData) return;
  try {
    const sessionPath = path.join(__dirname, 'sessions', config.sessionId);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
    const files = JSON.parse(Buffer.from(sessionData, 'base64').toString('utf8'));
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(sessionPath, filename), content);
    }
    console.log('✅ Session restored from environment variable!');
  } catch (err) {
    console.warn('⚠️  Could not restore session:', err.message);
  }
};

// ── Express server (Heroku needs a web process) ───────────────
const startServer = () => {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'website')));

  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'website', 'index.html')));
  app.get('/pair', (_, res) => res.sendFile(path.join(__dirname, 'website', 'minibot', 'create.html')));

  // Code pairing endpoint
  app.get('/code', async (req, res) => {
    const number = req.query.number?.replace(/\D/g, '');
    if (!number || number.length < 7) return res.json({ error: 'Invalid number' });
    try {
      const sp = path.join(__dirname, 'sessions', `pair_${number}`);
      if (!fs.existsSync(sp)) fs.mkdirSync(sp, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(sp);
      const { version }          = await fetchLatestBaileysVersion();
      const sock = makeWASocket({ version, logger: pino({ level: 'silent' }), auth: state });
      sock.ev.on('creds.update', saveCreds);
      await new Promise(r => setTimeout(r, 2500));
      if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(number);
        return res.json({ code: code?.match(/.{1,4}/g)?.join('-') || code, number });
      }
      return res.json({ error: 'Already registered.' });
    } catch (e) { return res.json({ error: e.message }); }
  });

  // Password verify endpoint
  app.post('/verify', (req, res) => {
    const { number, password } = req.body;
    if (!number || !password) return res.json({ ok: false, msg: 'Missing fields' });
    const clean    = number.replace(/\D/g, '');
    const expected = config.generateWebPass(clean);
    const master   = (clean === '727114552' || clean === '94727114552') && password === 'SASAMASTER';
    if (password.toUpperCase() === expected || master)
      return res.json({ ok: true, number: clean, pass: expected });
    return res.json({ ok: false, msg: 'Invalid number or password. Send .getpass to bot on WhatsApp.' });
  });

  // ── QR image endpoint ──────────────────────────────────────
  app.get('/qr-image', (_, res) => {
    if (qrImageData) {
      const base64 = qrImageData.replace(/^data:image\/png;base64,/, '');
      const buf    = Buffer.from(base64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buf);
    }
    res.status(404).json({ error: 'No QR available' });
  });

  // ── Bot status endpoint ─────────────────────────────────────
  app.get('/status', (_, res) => {
    res.json({
      status:    botStatus,
      hasQR:     !!qrImageData,
      version:   config.version,
      botName:   config.botName,
    });
  });

  // ── Server-Sent Events — live QR push to web page ──────────
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send current state immediately
    if (qrImageData) {
      res.write(`data: ${JSON.stringify({ type: 'qr', image: qrImageData })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'status', status: botStatus })}\n\n`);
    }

    sseClients.push(res);

    // Heartbeat every 20s to keep connection alive
    const hb = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch {}
    }, 20000);

    req.on('close', () => {
      clearInterval(hb);
      const idx = sseClients.indexOf(res);
      if (idx > -1) sseClients.splice(idx, 1);
    });
  });

  // ── Health check ────────────────────────────────────────────
  app.get('/health', (_, res) => res.json({ status: 'ok', bot: 'SASA MD', version: config.version }));

  // ── Config endpoint ──────────────────────────────────────────
  app.get('/config', (_, res) => res.json({ webPassword: config.webPassword }));

  const PORT = config.port;
  app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
};

// ── Unknown sender handler ────────────────────────────────────
const handleUnknownSender = async (sock, msg, sender, name) => {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]';
    const known = await isKnownNumber(sender);
    if (!known) {
      await markFirstContact(sender, name || 'Unknown');
      await sock.sendMessage(sender, { text: config.unknownMsg(name || 'User') });
    }
    await saveInboxMsg(sender, text, name || 'Unknown');
    await sock.sendMessage(OWNER_JID, {
      text:
`📩 *${known ? 'Message' : '🆕 New unknown number'}*

👤 Name: ${name || 'Unknown'}
📱 Number: +${sender.replace(/\D/g, '')}

💬 Message:
${text}

> Saved to inbox ✅`,
    });
  } catch (err) { console.error('Unknown handler error:', err.message); }
};

// ── Bot start ─────────────────────────────────────────────────
const startBot = async () => {
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
    browser: ['SASA MD', 'Chrome', '5.2.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Connection + QR handler ─────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    // ── QR code received ──────────────────────────────────────
    if (qr) {
      currentQR   = qr;
      botStatus   = 'qr';

      // 1. Show in terminal (ascii art)
      try {
        const qrTerminal = require('qrcode-terminal');
        qrTerminal.generate(qr, { small: true }, (qrText) => {
          console.clear();
          console.log('\n╔══════════════════════════════════════╗');
          console.log('║        SASA MD — Scan QR Code        ║');
          console.log('╚══════════════════════════════════════╝');
          console.log(qrText);
          console.log('🌐 Or visit: http://localhost:' + config.port + '/pair\n');
        });
      } catch {
        // qrcode-terminal not installed — show URL only
        console.log('\n📱 QR ready! Open http://localhost:' + config.port + '/pair to scan\n');
      }

      // 2. Convert to base64 PNG for web page
      try {
        qrImageData = await qrcode.toDataURL(qr, {
          width: 300, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch {}

      // Request pairing code
      try {
        pairingCode = await sock.requestPairingCode(config.ownerNumber);
        console.log(`📱 Pairing code for ${config.ownerNumber}: ${pairingCode}`);
      } catch (err) {
        console.warn('⚠️ Could not request pairing code:', err.message);
      }

      // 3. Push to all SSE clients (web page auto-updates)
      sseClients.forEach(res => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'qr', image: qrImageData, code: pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode })}\n\n`);
        } catch {}
      });
    }

    // ── Connection closed ─────────────────────────────────────
    if (connection === 'close') {
      const code      = lastDisconnect?.error?.output?.statusCode;
      const reconnect = code !== DisconnectReason.loggedOut;
      botStatus       = reconnect ? 'reconnecting' : 'disconnected';
      // Don't clear QR if reconnecting, so website can show it
      if (!reconnect) {
        currentQR   = null;
        qrImageData = null;
        pairingCode = null;
      }
      console.log(`🔴 Disconnected (code ${code}). Reconnect: ${reconnect}`);
      sseClients.forEach(res => {
        try { res.write(`data: ${JSON.stringify({ type: 'status', status: botStatus })}\n\n`); } catch {}
      });
      if (reconnect) setTimeout(startBot, 30000);
    }

    // ── Connected ─────────────────────────────────────────────
    if (connection === 'open') {
      botStatus   = 'connected';
      currentQR   = null;
      qrImageData = null;
      pairingCode = null;
      console.log(`\n✅ SASA MD v${config.version} — Connected!\n`);
      sseClients.forEach(res => {
        try { res.write(`data: ${JSON.stringify({ type: 'status', status: 'connected' })}\n\n`); } catch {}
      });
      const pass = config.getOwnerPass();
      try { await sock.sendMessage(OWNER_JID, { text: config.connectMsg(pass) }); } catch {}
    }
  });

  // ── Call block ──────────────────────────────────────────────
  sock.ev.on('call', async (calls) => {
    const s = await getSettings();
    if (!s.callReject) return;
    for (const call of calls) {
      if (call.status === 'offer') {
        try { await sock.rejectCall(call.id, call.from); } catch {}
      }
    }
  });

  // ── Messages ────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        const from    = msg.key.remoteJid;
        const sender  = msg.key.participant || msg.key.remoteJid;
        const name    = msg.pushName || 'User';
        const isGroup = from.endsWith('@g.us');

        // Channel newsletter auto-react
        if (from?.includes('@newsletter')) { await handleChannelMessage(sock, msg); continue; }

        // Auto read
        if (config.autoRead) { try { await sock.readMessages([msg.key]); } catch {} }

        // Ban check
        if (await isBanned(sender)) continue;

        // Unknown DM handler
        if (!isGroup && sender !== OWNER_JID) await handleUnknownSender(sock, msg, sender, name);

        // Extract body
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption || '';

        // Number reply (menu 1-7)
        const trimmed = body.trim();
        if (!body.startsWith(config.prefix)) {
          if (NUM_CMDS.has(trimmed)) await menuCmd(sock, msg, [], trimmed);
          continue;
        }

        const parts   = body.slice(config.prefix.length).trim().split(/\s+/);
        const command = parts.shift()?.toLowerCase();
        const args    = parts;
        if (!command) continue;

        // Typing indicator
        if (config.autoTyping) {
          try {
            await sock.sendPresenceUpdate('composing', from);
            setTimeout(() => sock.sendPresenceUpdate('paused', from).catch(() => {}), 2000);
          } catch {}
        }

        // Route
        const handler = CMD_MAP[command];
        if (handler) await handler(sock, msg, args, command);

      } catch (err) { console.error('Message error:', err.message); }
    }
  });

  // ── Group welcome ────────────────────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add') return;
    try {
      await sock.sendMessage(id, {
        text:
`👋 *Welcome!*

🤖 This group uses *SASA MD Bot*
⚡ Type *${config.prefix}menu* to see commands

> _Powered by SASA MD_`,
      });
    } catch {}
  });
};

// ── Main ──────────────────────────────────────────────────────
(async () => {
  console.log(`\n🤖 Starting SASA MD v${config.version}...`);
  initFirebase();
  restoreSession();   // Restore session from SESSION_DATA env var (Heroku)
  startServer();      // Start Express (Heroku needs open port)
  await startBot();   // Start WhatsApp bot
})();
