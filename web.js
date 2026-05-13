const express = require('express');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const { globalLimit, apiLimit, securityHeaders, blockSuspicious } = require('./middleware/security');

const SITE_DIR = path.join(__dirname, 'website');

const startServer = () => {
  const app = express();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:["'self'"],
        scriptSrc:["'self'","'unsafe-inline'","fonts.googleapis.com","cdnjs.cloudflare.com"],
        styleSrc:["'self'","'unsafe-inline'","fonts.googleapis.com"],
        fontSrc:["'self'","fonts.gstatic.com"],
        imgSrc:["'self'","data:","https:"],
        connectSrc:["'self'","https:","wss:"],
        frameSrc:["'self'"],
        objectSrc:["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(securityHeaders);
  app.use(globalLimit);
  app.use(blockSuspicious);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(SITE_DIR, { extensions: ['html'], index: 'index.html' }));

  const PAGES = {
    '/':'index.html',
    '/about':'about.html',
    '/contact':'contact.html',
    '/privacy':'privacy.html',
    '/channel':'channel.html',
    '/minibot':'minibot/index.html',
    '/minibot/setting':'minibot/setting.html',
    '/minibot/autoreply':'minibot/autoreply.html',
    '/minibot/autosave':'minibot/autosave.html',
    '/minibot/coin':'minibot/coin.html',
    '/minibot/create':'minibot/create.html',
    '/pair':'minibot/create.html',
    '/admin':'admin/index.html',
  };

  for (const [route, file] of Object.entries(PAGES)) {
    app.get(route, (_, res) => res.sendFile(path.join(SITE_DIR, file)));
  }

  app.get('/robots.txt', (_, res) => res.sendFile(path.join(SITE_DIR, 'robots.txt')));
  app.get('/status', apiLimit, (_, res) => res.json({ status: 'website', version: config.version, hasQR: false }));
  app.get('/health', (_, res) => res.json({ ok: true, status: 'website', version: config.version }));

  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type:'status', status:'offline' })}\n\n`);
    const hb = setInterval(() => { try { res.write(':hb\n\n'); } catch {} }, 20000);
    req.on('close', () => clearInterval(hb));
  });

  app.get('/qr-image', apiLimit, (_, res) => {
    res.status(503).json({ error: 'Bot server unavailable' });
  });

  app.get('/code', apiLimit, (_, res) => {
    res.status(503).json({ error: 'Bot server unavailable' });
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error:'Not found' });
    res.status(404).sendFile(path.join(SITE_DIR,'index.html'));
  });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`🌐 Website server → http://localhost:${config.port}`);
  });
};

startServer();
