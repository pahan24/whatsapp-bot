// ══════════════════════════════════════
//   SASA MD — Shared JS v3
//   Clean URLs, Fixed Navigation
// ══════════════════════════════════════

// ── Particles ─────────────────────────
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
  const pts = Array.from({ length: 55 }, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*3+1,
    dx: (Math.random()-.5)*.4, dy: (Math.random()-.5)*.4,
    a: Math.random()*.5+.1, da: (Math.random()-.5)*.005,
    white: Math.random() > .7,
  }));
  function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x+=p.dx; p.y+=p.dy; p.a+=p.da;
      if(p.a<.05||p.a>.65) p.da*=-1;
      if(p.x<0||p.x>W) p.dx*=-1;
      if(p.y<0||p.y>H) p.dy*=-1;
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
      g.addColorStop(0, p.white ? `rgba(255,255,255,${p.a*.5})` : `rgba(220,0,20,${p.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── SVG Logo ──────────────────────────
const LOGO_SVG = `<svg width="38" height="38" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="42" height="42" rx="10" fill="#1a0308"/>
  <circle cx="21" cy="21" r="18" stroke="#e8001d" stroke-width="1.5" opacity="0.4"/>
  <path d="M9 26 L13 16 L17 22 L21 13 L25 22 L29 16 L33 26 Z" fill="#e8001d" opacity="0.9"/>
  <rect x="9" y="26" width="24" height="4" rx="2" fill="#e8001d" opacity="0.85"/>
  <circle cx="13" cy="15" r="2.2" fill="#ff4d4d"/>
  <circle cx="21" cy="12" r="2.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="29" cy="15" r="2.2" fill="#ff4d4d"/>
</svg>`;

// ── Navigation items (CLEAN URLs — no .html) ──
const NAV_ITEMS = [
  { href: '/',                icon: '🏠', label: 'Home'       },
  { href: '/minibot',         icon: '🤖', label: 'Mini Bot'   },
  { href: '/minibot/create',  icon: '⚡', label: 'Main Bot'   },
  { href: '/about',           icon: 'ℹ',  label: 'About Us'   },
  { href: '/contact',         icon: '✉',  label: 'Contact'    },
  { href: '/privacy',         icon: '🔒', label: 'Privacy'    },
  { href: '/channel',         icon: '💬', label: 'Channel'    },
];

// Detect active route using window.location.pathname
function isActive(href) {
  const p = window.location.pathname;
  if (href === '/') return p === '/';
  return p === href || p.startsWith(href + '/');
}

// ── Build Navbar ───────────────────────
function buildNav() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  navbar.innerHTML = `
    <a href="/" class="nav-logo" style="display:flex;align-items:center;gap:8px;text-decoration:none;">
      ${LOGO_SVG}
      <span style="font-family:'Orbitron',sans-serif;font-size:1.05rem;font-weight:900;letter-spacing:1px;">
        <span style="color:#e8001d;">SASA</span><span style="color:#fff;"> MD</span>
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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
      <div style="display:flex;align-items:center;gap:8px;">
        ${LOGO_SVG}
        <span style="font-family:'Orbitron',sans-serif;font-size:0.95rem;font-weight:900;">
          <span style="color:#e8001d;">SASA</span><span style="color:#fff;"> MD</span>
        </span>
      </div>
      <button onclick="closeDrawer()" style="width:34px;height:34px;background:rgba(232,0,29,0.15);border:none;border-radius:8px;color:#fff;font-size:1rem;cursor:pointer;">✕</button>
    </div>
    <div class="drawer-nav">
      ${NAV_ITEMS.map(item => `
        <a href="${item.href}" class="drawer-item ${isActive(item.href) ? 'active' : ''}">
          <div class="drawer-icon">${item.icon}</div>
          <span>${item.label}</span>
          <span class="drawer-arrow">›</span>
        </a>`).join('')}
    </div>
    <div class="drawer-footer">© 2025 SASA MD TEAM</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // Show active status if logged in
  if (sasaAuth.isLoggedIn()) {
    const ns = document.getElementById('navStatus');
    if (ns) ns.style.display = 'flex';
  }

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

// ── Auth ──────────────────────────────
const sasaAuth = {
  generatePassword(number) {
    const seed = number.replace(/\D/g,'');
    let hash = 0;
    for (const c of seed) hash = (hash*31 + c.charCodeAt(0)) & 0x7fffffff;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pw = 'SM', h = hash;
    for (let i=0; i<6; i++) { pw += chars[h%chars.length]; h = Math.floor(h/chars.length)||hash+i+1; }
    return pw;
  },
  async login(number, password) {
    // Try server-side verify first
    try {
      const res = await fetch('/verify', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({number, password}),
      });
      const data = await res.json();
      if (data.ok) {
        const clean = number.replace(/\D/g,'');
        localStorage.setItem('sasa_session', JSON.stringify({ number:clean, time:Date.now() }));
        return { ok:true };
      }
      return { ok:false, msg: data.msg };
    } catch {
      // Fallback to client-side check
      const clean = number.replace(/\D/g,'');
      const expected = this.generatePassword(clean);
      const master = (clean==='727114552'||clean==='94727114552') && password==='SASAMASTER';
      if (password.toUpperCase()===expected||master) {
        localStorage.setItem('sasa_session', JSON.stringify({ number:clean, time:Date.now() }));
        return { ok:true };
      }
      return { ok:false, msg:'Invalid credentials. Send .getpass to bot.' };
    }
  },
  logout() { localStorage.removeItem('sasa_session'); },
  isLoggedIn() {
    const s = localStorage.getItem('sasa_session');
    if (!s) return false;
    const d = JSON.parse(s);
    return (Date.now()-d.time) < 86400000*7;
  },
  getNumber() {
    const s = localStorage.getItem('sasa_session');
    return s ? JSON.parse(s).number : null;
  },
};

// ── Settings ──────────────────────────
const sasaSettings = {
  get() { try { return JSON.parse(localStorage.getItem('sasa_settings')||'{}'); } catch { return {}; } },
  set(k,v) { const s=this.get(); s[k]=v; localStorage.setItem('sasa_settings',JSON.stringify(s)); },
  getKey(k,def=null) { return this.get()[k]??def; },
};

// ── Coins ─────────────────────────────
const sasaCoins = {
  key: (n) => `sasa_coin_${n||sasaAuth.getNumber()}`,
  get(n) { try { return JSON.parse(localStorage.getItem(this.key(n))||'null')||{balance:0,spent:0,claimedDaily:null,claimedWelcome:false,claimedFree:false}; } catch { return {balance:0,spent:0}; } },
  save(n,d) { localStorage.setItem(this.key(n),JSON.stringify(d)); },
  add(n,amt) { const d=this.get(n); d.balance+=amt; this.save(n,d); return d; },
};

// ── Auto Replies ──────────────────────
const sasaReplies = {
  get() { try { return JSON.parse(localStorage.getItem('sasa_replies')||'[]'); } catch { return []; } },
  save(a) { localStorage.setItem('sasa_replies',JSON.stringify(a)); },
  add(r) { const a=this.get(); a.unshift({...r,id:Date.now().toString()}); this.save(a); },
  delete(id) { this.save(this.get().filter(r=>r.id!==id)); },
  update(id,r) { this.save(this.get().map(x=>x.id===id?{...x,...r}:x)); },
};

// ── Toast ─────────────────────────────
function showToast(msg, type='info') {
  let t = document.getElementById('globalToast');
  if (!t) { t=document.createElement('div'); t.id='globalToast'; t.className='toast'; document.body.appendChild(t); }
  t.className=`toast ${type}`; t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3200);
}

// ── Build Footer ───────────────────────
function buildFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;
  footer.innerHTML = `
    <div style="max-width:500px;margin:0 auto;text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem;">
        ${LOGO_SVG}
        <span style="font-family:'Orbitron',sans-serif;font-size:1rem;font-weight:900;">
          <span style="color:#e8001d;">SASA</span><span style="color:#fff;"> MD</span>
        </span>
      </div>
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:0.4rem 1.2rem;margin-bottom:1rem;">
        ${NAV_ITEMS.map(i=>`<a href="${i.href}" style="color:#555;font-size:0.8rem;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='#e8001d'" onmouseout="this.style.color='#555'">${i.label}</a>`).join('')}
      </div>
      <p style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:#444;">© 2025 SASA MD TEAM — All rights reserved</p>
    </div>`;
}

// ── Init ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  buildNav();
  buildFooter();
});
