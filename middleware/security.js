const rateLimit = require('express-rate-limit');
const jwt       = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET   = process.env.JWT_SECRET   || 'sasa_md_jwt_secret_2025_' + Math.random();
const ADMIN_USER   = process.env.ADMIN_NUMBER  || '94727114552';
const ADMIN_PASS   = process.env.ADMIN_PASS    || 'sasa2009';

// ── Rate limiters ─────────────────────────────────────────────
const globalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});

const apiLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 min
  max: 30,
  message: { error: 'API rate limit exceeded.' },
});

const loginLimit = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 min
  max: 10,
  message: { error: 'Too many login attempts. Try again in 5 minutes.' },
});

const codeLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'Too many pairing requests.' },
});

// ── JWT helpers ───────────────────────────────────────────────
const signAdminToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

const verifyAdminToken = (token) => {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
};

// ── Admin auth middleware ─────────────────────────────────────
const requireAdmin = (req, res, next) => {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.sasa_admin;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyAdminToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.admin = payload;
  next();
};

// ── Admin credentials check ───────────────────────────────────
const checkAdminCreds = (username, password) => {
  const uOk = username?.replace(/\D/g,'') === ADMIN_USER.replace(/\D/g,'');
  const pOk = password === ADMIN_PASS;
  return uOk && pOk;
};

// ── Security headers (custom additions to helmet) ─────────────
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Bot', 'SASA MD');
  res.setHeader('X-Powered-By', 'SASA MD v5.2.0');
  res.removeHeader('Server');
  next();
};

// ── Block suspicious paths ────────────────────────────────────
const blockSuspicious = (req, res, next) => {
  const suspicious = [
    '.env', '.git', 'wp-admin', 'wp-login', 'phpmyadmin',
    'xmlrpc', '.php', '.asp', '.aspx', 'shell', 'config.js',
    'firebase.js', 'package.json', 'node_modules',
  ];
  const path = req.path.toLowerCase();
  if (suspicious.some(s => path.includes(s))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = {
  globalLimit, apiLimit, loginLimit, codeLimit,
  requireAdmin, checkAdminCreds, signAdminToken, verifyAdminToken,
  securityHeaders, blockSuspicious,
  JWT_SECRET, ADMIN_USER, ADMIN_PASS,
};
