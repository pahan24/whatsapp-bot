// ══════════════════════════════════════
//   SASA MD — Shared JS v2
// ══════════════════════════════════════

// ── PARTICLES ──────────────────────────
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 3 + 1,
    dx: (Math.random() - 0.5) * 0.45,
    dy: (Math.random() - 0.5) * 0.45,
    alpha: Math.random() * 0.5 + 0.1,
    dAlpha: (Math.random() - 0.5) * 0.005,
    isWhite: Math.random() > 0.7,
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      p.alpha += p.dAlpha;
      if (p.alpha < 0.05 || p.alpha > 0.65) p.dAlpha *= -1;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      if (p.isWhite) {
        g.addColorStop(0, `rgba(255,255,255,${p.alpha * 0.5})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        g.addColorStop(0, `rgba(220,0,20,${p.alpha})`);
        g.addColorStop(1, 'rgba(180,0,10,0)');
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── SVG LOGO ───────────────────────────
const LOGO_SVG = `<svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="42" height="42" rx="10" fill="#1a0308"/>
  <circle cx="21" cy="21" r="18" stroke="#e8001d" stroke-width="1.5" opacity="0.4"/>
  <circle cx="21" cy="21" r="13" stroke="#e8001d" stroke-width="1" opacity="0.25"/>
  <!-- Crown -->
  <path d="M9 26 L13 16 L17 22 L21 13 L25 22 L29 16 L33 26 Z" fill="#e8001d" opacity="0.9"/>
  <rect x="9" y="26" width="24" height="4" rx="2" fill="#e8001d" opacity="0.85"/>
  <!-- Gems on crown -->
  <circle cx="13" cy="15" r="2.2" fill="#ff4d4d"/>
  <circle cx="21" cy="12" r="2.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="29" cy="15" r="2.2" fill="#ff4d4d"/>
  <!-- Crown center gem shine -->
  <circle cx="21.5" cy="11.5" r="0.9" fill="#ffffff" opacity="0.8"/>
</svg>`;

// ── NAV ITEMS ──────────────────────────
const NAV_ITEMS = [
  { href: 'index.html',          rootHref: 'index.html',          icon: '🏠', label: 'Home' },
  { href: 'minibot/index.html',  rootHref: 'minibot/index.html',  icon: '🤖', label: 'Mini Bot' },
  { href: 'minibot/create.html', rootHref: 'minibot/create.html', icon: '⚡', label: 'Main Bot' },
  { href: 'about.html',          rootHref: 'about.html',          icon: 'ℹ', label: 'About Us' },
  { href: 'contact.html',        rootHref: 'contact.html',        icon: '✉', label: 'Contact' },
  { href: 'privacy.html',        rootHref: 'privacy.html',        icon: '🔒', label: 'Privacy' },
  { href: 'channel.html',        rootHref: 'channel.html',        icon: '💬', label: 'Channel' },
];

const isInMinibot = location.pathname.includes('/minibot/');
const prefix = isInMinibot ? '../' : '';

function getHref(item) {
  return isInMinibot ? item.href : item.rootHref;
}

function buildNav() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const current = location.pathname.split('/').pop() || 'index.html';

  navbar.innerHTML = `
    <a href="${prefix}index.html" class="nav-logo" style="display:flex;align-items:center;gap:8px;text-decoration:none;">
      ${LOGO_SVG}
      <span style="font-family:'Orbitron',sans-serif;font-size:1.05rem;font-weight:900;letter-spacing:1px;">
        <span class="red" style="color:#e8001d;">SASA</span>
        <span class="white" style="color:#fff;"> MD</span>
      </span>
    </a>
    <div style="display:flex;align-items:center;gap:0.7rem;">
      <div id="navStatus" class="nav-status" style="display:none;">
        <div class="dot"></div><span style="font-size:0.7rem;">ACTIVE</span>
      </div>
      <button class="hamburger-btn" id="menuBtn" onclick="toggleDrawer()">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  // Drawer overlay
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'drawerOverlay';
  overlay.onclick = closeDrawer;

  // Drawer
  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'drawer';
  drawer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;">
      <div style="display:flex;align-items:center;gap:8px;">
        ${LOGO_SVG}
        <span style="font-family:'Orbitron',sans-serif;font-size:0.95rem;font-weight:900;">
          <span style="color:#e8001d;">SASA</span><span style="color:#fff;"> MD</span>
        </span>
      </div>
      <button class="drawer-close" onclick="closeDrawer()" style="width:36px;height:36px;background:rgba(232,0,29,0.15);border:none;border-radius:8px;color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
    </div>
    <div class="drawer-nav">
      ${NAV_ITEMS.map(item => {
        const href = getHref(item);
        const isActive = current === item.href.split('/').pop();
        return `
          <a href="${href}" class="drawer-item ${isActive ? 'active' : ''}">
            <div class="drawer-icon">${item.icon}</div>
            <span>${item.label}</span>
            <span class="drawer-arrow">›</span>
          </a>`;
      }).join('')}
    </div>
    <div class="drawer-footer">© 2025 SASA MD TEAM</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // Show active nav status if logged in
  if (sasaAuth.isLoggedIn()) {
    const ns = document.getElementById('navStatus');
    if (ns) ns.style.display = 'flex';
  }

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

function toggleDrawer() {
  document.getElementById('drawer').classList.toggle('open');
  document.getElementById('drawerOverlay').classList.toggle('open');
  document.getElementById('menuBtn').classList.toggle('open');
}
function closeDrawer() {
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('drawerOverlay')?.classList.remove('open');
  document.getElementById('menuBtn')?.classList.remove('open');
}

// ── AUTH ───────────────────────────────
const sasaAuth = {
  OWNER_NUMBER: '94727114552',
  CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb7ChKeAojYnYh1uMo3q',

  generatePassword(number) {
    const seed = number.replace(/\D/g, '');
    let hash = 0;
    for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pw = 'RQ';
    let h = hash;
    for (let i = 0; i < 6; i++) { pw += chars[h % chars.length]; h = Math.floor(h / chars.length) || hash + i + 1; }
    return pw;
  },

  login(number, password) {
    const clean = number.replace(/\D/g, '');
    const expected = this.generatePassword(clean);
    const isOwner = clean === '727114552' || clean === '94727114552';
    const masterPass = isOwner && password.toUpperCase() === 'SASAMASTER';
    const ownerFixedPass = clean === '94727114552' && password === 'sasa2009';
    if (password.toUpperCase() === expected || masterPass || ownerFixedPass) {
      sessionStorage.setItem('sasa_session', JSON.stringify({ number: clean, time: Date.now() }));
      localStorage.setItem('sasa_session', JSON.stringify({ number: clean, time: Date.now() }));
      return { ok: true };
    }
    return { ok: false, msg: `❌ Invalid credentials.\n\nSend *${password.startsWith('.') ? password : '.getpass'}* to bot on WhatsApp to get your password.` };
  },

  logout() {
    sessionStorage.removeItem('sasa_session');
    localStorage.removeItem('sasa_session');
  },

  isLoggedIn() {
    const s = localStorage.getItem('sasa_session') || sessionStorage.getItem('sasa_session');
    if (!s) return false;
    const d = JSON.parse(s);
    return (Date.now() - d.time) < 86400000 * 7;
  },

  getNumber() {
    const s = localStorage.getItem('sasa_session') || sessionStorage.getItem('sasa_session');
    return s ? JSON.parse(s).number : null;
  },

  require(redirect = `${prefix}minibot/index.html`) {
    if (!this.isLoggedIn()) { location.href = redirect; return false; }
    return true;
  }
};

// ── SETTINGS ───────────────────────────
const sasaSettings = {
  get() { try { return JSON.parse(localStorage.getItem('sasa_settings') || '{}'); } catch { return {}; } },
  set(k, v) { const s = this.get(); s[k] = v; localStorage.setItem('sasa_settings', JSON.stringify(s)); },
  getKey(k, def = null) { return this.get()[k] ?? def; }
};

// ── COINS ──────────────────────────────
const sasaCoins = {
  key: (num) => `sasa_coin_${num || sasaAuth.getNumber()}`,
  get(number) {
    try { return JSON.parse(localStorage.getItem(this.key(number)) || 'null') || { balance: 0, spent: 0, claimedDaily: null, claimedWelcome: false, claimedFree: false }; }
    catch { return { balance: 0, spent: 0, claimedDaily: null, claimedWelcome: false, claimedFree: false }; }
  },
  save(number, data) { localStorage.setItem(this.key(number), JSON.stringify(data)); },
  add(number, amount) { const d = this.get(number); d.balance += amount; this.save(number, d); return d; },
};

// ── AUTO REPLY ─────────────────────────
const sasaReplies = {
  get() { try { return JSON.parse(localStorage.getItem('sasa_replies') || '[]'); } catch { return []; } },
  save(arr) { localStorage.setItem('sasa_replies', JSON.stringify(arr)); },
  add(rule) { const arr = this.get(); arr.unshift({ ...rule, id: Date.now().toString() }); this.save(arr); },
  delete(id) { this.save(this.get().filter(r => r.id !== id)); },
  update(id, rule) { this.save(this.get().map(r => r.id === id ? { ...r, ...rule } : r)); }
};

// ── TOAST ──────────────────────────────
function showToast(msg, type = 'info') {
  let t = document.getElementById('globalToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'globalToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.className = `toast ${type}`;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── INIT ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  buildNav();
  // Build footer if element exists
  const footer = document.getElementById('footer');
  if (footer) {
    footer.innerHTML = `
      <div style="max-width:500px;margin:0 auto;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem;">
          ${LOGO_SVG}
          <span style="font-family:'Orbitron',sans-serif;font-size:1rem;font-weight:900;">
            <span style="color:#e8001d;">SASA</span><span style="color:#fff;"> MD</span>
          </span>
        </div>
        <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:0.4rem 1.2rem;margin-bottom:1rem;">
          ${NAV_ITEMS.map(i => `<a href="${getHref(i)}" style="color:#555;font-size:0.8rem;transition:color 0.2s;" onmouseover="this.style.color='#e8001d'" onmouseout="this.style.color='#555'">${i.label}</a>`).join('')}
        </div>
        <p style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:#444;">© 2025 SASA MD TEAM — All rights reserved</p>
      </div>`;
  }
});
