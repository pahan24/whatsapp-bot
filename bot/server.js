const express = require('express');
const path    = require('path');
const fs      = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino   = require('pino');
const config = require('./config');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'website')));

// Serve pair page
app.get('/pair', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'website', 'minibot', 'create.html'))
);

// Generate pairing code endpoint
app.get('/code', async (req, res) => {
  const number = req.query.number?.replace(/\D/g, '');
  if (!number || number.length < 7) return res.json({ error: 'Invalid number' });

  try {
    const sessionPath = path.join(__dirname, 'sessions', `pair_${number}`);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version }          = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: ['SASA MD', 'Chrome', '5.2.0'],
      printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    await new Promise(r => setTimeout(r, 2500));

    if (!sock.authState.creds.registered) {
      const code      = await sock.requestPairingCode(number);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      return res.json({ code: formatted, number });
    }
    return res.json({ error: 'Already registered. Start the bot normally.' });
  } catch (e) {
    return res.json({ error: e.message });
  }
});

// Web password verification endpoint
app.post('/verify', (req, res) => {
  const { number, password } = req.body;
  if (!number || !password) return res.json({ ok: false, msg: 'Missing fields' });
  const clean    = number.replace(/\D/g, '');
  const expected = config.generateWebPass(clean);
  const master   = (clean === '727114552' || clean === '94727114552') && password === 'SASAMASTER';
  if (password.toUpperCase() === expected || master) {
    return res.json({ ok: true, number: clean });
  }
  return res.json({ ok: false, msg: 'Invalid number or password. Send .getpass to bot.' });
});

app.listen(config.pairPort, () => {
  console.log(`\n🌐 SASA MD Server running at http://localhost:${config.pairPort}`);
  console.log(`🔗 Pair page: http://localhost:${config.pairPort}/pair\n`);
});
