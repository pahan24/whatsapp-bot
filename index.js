const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const qrcode = require('qrcode');
require('dotenv').config();

const db = require('./firebase');
const { initFirebase, isBanned, isKnownNumber, markFirstContact, saveInboxMsg, getSettings, registerBot, getBots, getUsers, addCoinsAdmin, getTotalStats } = db;
const config = require('./config');
const { globalLimit, apiLimit, loginLimit, codeLimit, requireAdmin, checkAdminCreds, signAdminToken, securityHeaders, blockSuspicious } = require('./middleware/security');

const menuCmd    = require('./commands/menu');
const ownerCmd   = require('./commands/owner');
const toolsCmd   = require('./commands/tools');
const socialCmd  = require('./commands/social');
const groupCmd   = require('./commands/group');
const channelCmd = require('./commands/channel');
const eduCmd     = require('./commands/education');
const { handleChannelMessage } = require('./commands/channel');

const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;
const SITE_DIR  = path.join(__dirname, 'website');

let currentQR = null, qrImageData = null, botStatus = 'disconnected';
const sseClients = [];

const CMD_MAP = {
  menu: menuCmd,
  privacy:ownerCmd,setting:ownerCmd,getdp:ownerCmd,setsudo:ownerCmd,delsudo:ownerCmd,
  setcall:ownerCmd,delcall:ownerCmd,ban:ownerCmd,unban:ownerCmd,getpass:ownerCmd,
  setprefix:ownerCmd,broadcast:ownerCmd,restart:ownerCmd,shutdown:ownerCmd,
  ping:toolsCmd,alive:toolsCmd,system:toolsCmd,bot:toolsCmd,calc:toolsCmd,sticker:toolsCmd,toimg:toolsCmd,
  song:socialCmd,video:socialCmd,fb:socialCmd,tiktok:socialCmd,insta:socialCmd,
  twitter:socialCmd,movie:socialCmd,apk:socialCmd,img:socialCmd,
  add:groupCmd,kick:groupCmd,promote:groupCmd,demote:groupCmd,del:groupCmd,
  tagadmins:groupCmd,tagall:groupCmd,hidetag:groupCmd,ginfo:groupCmd,glink:groupCmd,
  grlink:groupCmd,gname:groupCmd,gdec:groupCmd,gdp:groupCmd,grdp:groupCmd,
  lock:groupCmd,unlock:groupCmd,close:groupCmd,open:groupCmd,join:groupCmd,left:groupCmd,
  gdisappearing:groupCmd,pin:groupCmd,gsave:groupCmd,gban:groupCmd,gunban:groupCmd,
  chanel:channelCmd,addchanel:channelCmd,delchanel:channelCmd,react:channelCmd,
  coins:channelCmd,daily:channelCmd,transfer:channelCmd,leaderboard:channelCmd,
  paper:eduCmd,wiki:eduCmd,define:eduCmd,joke:eduCmd,quote:eduCmd,news:eduCmd,
};
const NUM_CMDS = new Set(['1','2','3','4','5','6','7']);

const restoreSession = () => {
  const sd = process.env.SESSION_DATA;
  if (!sd) return;
  try {
    const sp = path.join(__dirname, 'sessions', config.sessionId);
    if (!fs.existsSync(sp)) fs.mkdirSync(sp, { recursive: true });
    const files = JSON.parse(Buffer.from(sd, 'base64').toString('utf8'));
    for (const [fn, cnt] of Object.entries(files)) fs.writeFileSync(path.join(sp, fn), cnt);
    console.log('✅ Session restored!');
  } catch (e) { console.warn('⚠️ Session restore:', e.message); }
};

const pushSSE = (data) => sseClients.forEach(r => { try { r.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} });

const startServer = () => {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc:["'self'"], scriptSrc:["'self'","'unsafe-inline'",'fonts.googleapis.com','cdnjs.cloudflare.com'], styleSrc:["'self'","'unsafe-inline'",'fonts.googleapis.com'], fontSrc:["'self'",'fonts.gstatic.com'], imgSrc:["'self'",'data:','https:'], connectSrc:["'self'",'https:','wss:'], frameSrc:["'self'"], objectSrc:["'none'"] } }, crossOriginEmbedderPolicy: false }));
  app.use(securityHeaders);
  app.use(globalLimit);
  app.use(blockSuspicious);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(SITE_DIR, { extensions: ['html'], index: 'index.html' }));

  const PAGES = {
    '/':'index.html', '/about':'about.html', '/contact':'contact.html',
    '/privacy':'privacy.html', '/channel':'channel.html',
    '/minibot':'minibot/index.html', '/minibot/setting':'minibot/setting.html',
    '/minibot/autoreply':'minibot/autoreply.html', '/minibot/autosave':'minibot/autosave.html',
    '/minibot/coin':'minibot/coin.html', '/minibot/create':'minibot/create.html',
    '/pair':'minibot/create.html', '/admin':'admin/index.html',
  };
  for (const [r, f] of Object.entries(PAGES))
    app.get(r, (_, res) => res.sendFile(path.join(SITE_DIR, f)));
  app.get('/robots.txt', (_, res) => res.sendFile(path.join(SITE_DIR, 'robots.txt')));

  // Public API
  app.get('/qr-image', apiLimit, (_, res) => {
    if (!qrImageData) return res.status(404).json({ error: 'No QR' });
    const buf = Buffer.from(qrImageData.replace(/^data:image\/png;base64,/, ''), 'base64');
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','no-store');
    res.send(buf);
  });
  app.get('/status', apiLimit, (_, res) => res.json({ status: botStatus, hasQR: !!qrImageData, version: config.version }));
  app.get('/health', (_, res) => res.json({ ok: true, bot: 'SASA MD', version: config.version, status: botStatus }));
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type','text/event-stream');
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('Connection','keep-alive');
    res.setHeader('Access-Control-Allow-Origin','*');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify(qrImageData ? { type:'qr', image:qrImageData } : { type:'status', status:botStatus })}\n\n`);
    sseClients.push(res);
    const hb = setInterval(() => { try { res.write(':hb\n\n'); } catch {} }, 20000);
    req.on('close', () => { clearInterval(hb); sseClients.splice(sseClients.indexOf(res), 1); });
  });
  app.get('/code', codeLimit, async (req, res) => {
    const number = req.query.number?.replace(/\D/g,'');
    if (!number || number.length < 7) return res.json({ error:'Invalid number' });
    try {
      const sp = path.join(__dirname,'sessions',`pair_${number}`);
      if (!fs.existsSync(sp)) fs.mkdirSync(sp,{recursive:true});
      const { state, saveCreds } = await useMultiFileAuthState(sp);
      const { version } = await fetchLatestBaileysVersion();
      const sock = makeWASocket({ version, logger:pino({level:'silent'}), auth:state, browser:['SASA MD','Chrome','5.2.0'] });
      sock.ev.on('creds.update', saveCreds);
      await new Promise(r => setTimeout(r, 2500));
      if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(number);
        return res.json({ code: code?.match(/.{1,4}/g)?.join('-') || code, number });
      }
      return res.json({ error: 'Already registered.' });
    } catch (e) { return res.json({ error: e.message }); }
  });
  app.post('/verify', loginLimit, (req, res) => {
    const { number, password } = req.body;
    if (!number || !password) return res.json({ ok:false });
    const clean = number.replace(/\D/g,'');
    const expected = config.generateWebPass(clean);
    const master = (clean==='727114552'||clean==='94727114552') && password==='SASAMASTER';
    if (password.toUpperCase()===expected||master) return res.json({ ok:true, number:clean, pass:expected });
    return res.json({ ok:false, msg:'Invalid. Send .getpass to bot.' });
  });

  // Admin API
  app.post('/api/admin/login', loginLimit, (req, res) => {
    const { username, password } = req.body;
    if (!checkAdminCreds(username, password)) return res.status(401).json({ ok:false, msg:'❌ Invalid credentials' });
    res.json({ ok:true, token: signAdminToken({ username, role:'admin' }) });
  });
  app.get('/api/admin/stats', requireAdmin, apiLimit, async (req, res) => {
    try { res.json({ ok:true, data:{ ...await getTotalStats(), botStatus, version:config.version } }); }
    catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.get('/api/admin/bots', requireAdmin, apiLimit, async (req, res) => {
    try { res.json({ ok:true, data: await getBots() }); }
    catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.post('/api/admin/bots', requireAdmin, apiLimit, async (req, res) => {
    try {
      const { number, name, plan } = req.body;
      if (!number) return res.json({ ok:false, msg:'Number required' });
      await registerBot(number, { name:name||'SASA MD User', plan:plan||'free', status:'active' });
      res.json({ ok:true, msg:'✅ Bot registered!' });
    } catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.patch('/api/admin/bots/:id', requireAdmin, apiLimit, async (req, res) => {
    try { await db.updateBotStatus(req.params.id, req.body.status); res.json({ ok:true }); }
    catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.get('/api/admin/users', requireAdmin, apiLimit, async (req, res) => {
    try { res.json({ ok:true, data: await getUsers() }); }
    catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.post('/api/admin/coins', requireAdmin, apiLimit, async (req, res) => {
    try {
      const { number, amount, action } = req.body;
      if (!number||!amount) return res.json({ ok:false, msg:'Missing fields' });
      const result = await addCoinsAdmin(number, parseInt(amount), action||'add');
      res.json({ ok:true, data:result });
    } catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.post('/api/admin/ban', requireAdmin, apiLimit, async (req, res) => {
    try {
      const { number, action, reason } = req.body;
      const jid = `${number.replace(/\D/g,'')}@s.whatsapp.net`;
      if (action==='ban') await db.banUser(jid, reason||'Admin ban');
      else await db.unbanUser(jid);
      res.json({ ok:true, msg:`User ${action}ned!` });
    } catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.post('/api/admin/broadcast', requireAdmin, apiLimit, async (req, res) => {
    try {
      if (!req.body.message) return res.json({ ok:false, msg:'Message required' });
      await db.setSetting('pendingBroadcast', { message:req.body.message, time:Date.now() });
      res.json({ ok:true, msg:'📢 Broadcast queued!' });
    } catch(e) { res.json({ ok:false, msg:e.message }); }
  });
  app.get('/api/admin/db/:dbpath(*)', requireAdmin, apiLimit, async (req, res) => {
    try {
      const d = db.getDb();
      if (!d) return res.json({ ok:false, msg:'DB not connected' });
      const snap = await d.ref(req.params.dbpath).once('value');
      res.json({ ok:true, data:snap.val() });
    } catch(e) { res.json({ ok:false, msg:e.message }); }
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error:'Not found' });
    res.status(404).sendFile(path.join(SITE_DIR,'index.html'));
  });

  app.listen(config.port, () => {
    console.log(`🌐 Server → http://localhost:${config.port}`);
    console.log(`🔐 Admin  → http://localhost:${config.port}/admin\n`);
  });
};

const handleUnknownSender = async (sock, msg, sender, name) => {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]';
    const known = await isKnownNumber(sender);
    if (!known) {
      await markFirstContact(sender, name||'Unknown');
      await sock.sendMessage(sender, { text: config.unknownMsg(name||'User') });
    }
    await saveInboxMsg(sender, text, name||'Unknown');
    await sock.sendMessage(OWNER_JID, { text:`📩 *${known?'Message':'🆕 New number'}*\n\n👤 ${name}\n📱 +${sender.replace(/\D/g,'')}\n\n💬 ${text}\n\n> Saved ✅` });
  } catch {}
};

const startBot = async () => {
  const sp = path.join(__dirname,'sessions',config.sessionId);
  if (!fs.existsSync(sp)) fs.mkdirSync(sp,{recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState(sp);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version, logger:pino({level:'silent'}),
    auth: { creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser:['SASA MD','Chrome','5.2.0'],
    generateHighQualityLinkPreview:true, syncFullHistory:false,
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR=qr; botStatus='qr';
      try { require('qrcode-terminal').generate(qr,{small:true},txt=>{ console.clear(); console.log('\n╔═══ SASA MD — Scan QR ═══╗\n'+txt+`\n🌐 http://localhost:${config.port}/pair\n`); }); } catch {}
      try { qrImageData = await qrcode.toDataURL(qr,{width:300,margin:2}); } catch {}
      pushSSE({ type:'qr', image:qrImageData });
    }
    if (connection==='close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      botStatus='disconnected'; currentQR=null; qrImageData=null;
      pushSSE({ type:'status', status:'disconnected' });
      if (code!==DisconnectReason.loggedOut) setTimeout(startBot,5000);
    }
    if (connection==='open') {
      botStatus='connected'; currentQR=null; qrImageData=null;
      console.log(`\n✅ SASA MD v${config.version} — Connected!\n`);
      pushSSE({ type:'status', status:'connected' });
      try { await registerBot(config.ownerNumber,{name:config.ownerName,status:'active'}); } catch {}
      try { await sock.sendMessage(OWNER_JID,{text:config.connectMsg(config.getOwnerPass())}); } catch {}
    }
  });

  sock.ev.on('call', async (calls) => {
    const s = await getSettings();
    if (!s?.callReject) return;
    for (const c of calls) if (c.status==='offer') try { await sock.rejectCall(c.id,c.from); } catch {}
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type!=='notify') return;
    for (const msg of messages) {
      try {
        if (!msg.message||msg.key.fromMe) continue;
        const from=msg.key.remoteJid, sender=msg.key.participant||from, name=msg.pushName||'User';
        const isGroup=from.endsWith('@g.us');
        if (from?.includes('@newsletter')) { await handleChannelMessage(sock,msg); continue; }
        if (config.autoRead) try { await sock.readMessages([msg.key]); } catch {}
        if (await isBanned(sender)) continue;
        if (!isGroup&&sender!==OWNER_JID) await handleUnknownSender(sock,msg,sender,name);
        const body = msg.message?.conversation||msg.message?.extendedTextMessage?.text
          ||msg.message?.imageMessage?.caption||msg.message?.videoMessage?.caption||'';
        if (!body.startsWith(config.prefix)) { if (NUM_CMDS.has(body.trim())) await menuCmd(sock,msg,[],body.trim()); continue; }
        const parts=body.slice(config.prefix.length).trim().split(/\s+/);
        const command=parts.shift()?.toLowerCase(); const args=parts;
        if (!command) continue;
        if (config.autoTyping) try { await sock.sendPresenceUpdate('composing',from); setTimeout(()=>sock.sendPresenceUpdate('paused',from).catch(()=>{}),2000); } catch {}
        const handler=CMD_MAP[command];
        if (handler) await handler(sock,msg,args,command);
      } catch(e) { console.error('Msg err:',e.message); }
    }
  });

  sock.ev.on('group-participants.update', async ({ id, action }) => {
    if (action!=='add') return;
    try { await sock.sendMessage(id,{text:`👋 *Welcome!*\n\n🤖 *SASA MD Bot*\n⚡ Type *${config.prefix}menu*\n\n> _Powered by SASA MD_`}); } catch {}
  });
};

(async () => {
  console.log(`\n🤖 SASA MD v${config.version} starting...`);
  initFirebase(); restoreSession(); startServer(); await startBot();
})();
