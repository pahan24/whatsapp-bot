# SASA MD — WhatsApp Bot v5.2.0

## 📁 Structure
```
SASA-FINAL/
├── bot/                    ← WhatsApp Bot (Node.js)
│   ├── index.js            ← Main bot entry
│   ├── server.js           ← Web pairing server
│   ├── config.js           ← All settings
│   ├── firebase.js         ← Database layer
│   ├── .env.example        ← Config template
│   ├── commands/
│   │   ├── menu.js         ← .menu command (beautiful format)
│   │   ├── owner.js        ← Owner commands
│   │   ├── tools.js        ← ping, alive, system, sticker
│   │   ├── social.js       ← song, video, fb, tiktok, insta...
│   │   ├── group.js        ← All group management commands
│   │   ├── channel.js      ← Channel react + coin system
│   │   └── education.js    ← paper, wiki, define, joke, quote
│   └── sessions/           ← Auth sessions (auto-created)
└── website/                ← Dashboard Website
    ├── index.html          ← Home page
    ├── about.html
    ├── contact.html
    ├── privacy.html
    ├── channel.html
    ├── css/global.css
    ├── js/app.js
    └── minibot/
        ├── index.html      ← Mini Bot dashboard
        ├── create.html     ← Deploy/Pair bot
        ├── setting.html    ← Bot configuration
        ├── autoreply.html  ← Auto reply manager
        ├── autosave.html   ← Unknown message inbox
        └── coin.html       ← Coin wallet

```

## 🚀 Setup

### 1. Bot Setup
```bash
cd bot
npm install
cp .env.example .env
# Edit .env with your Firebase credentials
npm start
```

### 2. Pair Bot
```bash
node server.js
# Open http://localhost:3000/pair
# Enter number → get code → link in WhatsApp
```

### 3. Get Web Password
After bot connects, type `.getpass` in WhatsApp to get your password.

## ✅ Commands: 93 total
- Owner: privacy, setting, getdp, setsudo, delsudo, ban, unban, getpass...
- Social: song, video, fb, tiktok, insta, twitter, movie, apk, img
- Group: add, kick, promote, demote, tagall, ginfo, glink, lock, unlock...
- Channel: chanel, react, coins, daily, transfer, leaderboard
- Tools: ping, alive, system, sticker, toimg, calc
- Education: paper, wiki, define, joke, quote

© 2025 SASA MD TEAM
