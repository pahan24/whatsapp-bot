# 🚀 SASA MD — Heroku Deploy Guide

## Method 1: GitHub → Heroku (Recommended)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "SASA MD v5.2.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sasa-md.git
git push -u origin main
```

### Step 2 — Create Heroku App
1. Go to [heroku.com](https://heroku.com) → New → Create new app
2. Name: `sasa-md` (or any name)
3. Deploy tab → Connect GitHub → Select your repo
4. Enable Automatic deploys

### Step 3 — Add Config Vars
Go to: **Settings → Config Vars → Reveal Config Vars**

Add ALL these variables:
```
BOT_NAME          = SASA MD
PREFIX            = .
OWNER_NUMBER      = 94727114552
OWNER_NAME        = PAHAN
FIREBASE_PROJECT_ID    = your-project-id
FIREBASE_CLIENT_EMAIL  = firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY   = -----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n
FIREBASE_DATABASE_URL  = https://your-project-id-default-rtdb.firebaseio.com
AUTO_READ         = true
AUTO_TYPING       = true
```

### Step 4 — Get Session (IMPORTANT!)
The bot needs a session to connect. Do this FIRST on your local PC:

```bash
# On your local PC:
npm install
node index.js
# Scan QR code with WhatsApp
# Wait until "SASA MD Connected!" appears
# Then press Ctrl+C
node getsession.js
# Copy the long text that appears
```

Then add to Heroku Config Vars:
```
SESSION_DATA = (paste the long text here)
```

### Step 5 — Deploy
- Heroku → Deploy tab → Manual deploy → Deploy Branch
- Watch logs: Heroku → More → View logs

---

## Method 2: Heroku CLI

```bash
# Install Heroku CLI first
heroku login
heroku create sasa-md-bot
heroku config:set BOT_NAME="SASA MD"
heroku config:set OWNER_NUMBER="94727114552"
heroku config:set PREFIX="."
heroku config:set FIREBASE_PROJECT_ID="your-id"
heroku config:set FIREBASE_DATABASE_URL="https://your-id-rtdb.firebaseio.com"
heroku config:set FIREBASE_CLIENT_EMAIL="your@email.iam.gserviceaccount.com"
heroku config:set FIREBASE_PRIVATE_KEY="$(cat privatekey.pem)"
heroku config:set SESSION_DATA="$(node getsession.js | tail -1)"
git push heroku main
heroku logs --tail
```

---

## ✅ Verify Deployment
After deploying, check:
- `https://your-app.herokuapp.com/health` → should return `{"status":"ok"}`
- `https://your-app.herokuapp.com/` → should show SASA MD website
- WhatsApp → Bot should send Sinhala connect message

---

## ⚠️ Common Errors & Fixes

| Error | Fix |
|---|---|
| `No default language` | Make sure `package.json` & `Procfile` are at ROOT (not in a subfolder) |
| `Cannot find module` | Run `npm install` locally, check all `require()` paths |
| `Session expired` | Re-run `getsession.js` locally and update `SESSION_DATA` |
| `Firebase error` | Check all 4 Firebase config vars are set correctly |
| `H10 App crashed` | Check logs: `heroku logs --tail` |
| `R10 Boot timeout` | App must listen on `process.env.PORT` within 60s |

---

## 🔐 Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable **Realtime Database**
3. Project Settings → Service Accounts → **Generate new private key**
4. Open the downloaded JSON and copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
5. Database URL format: `https://YOUR-ID-default-rtdb.firebaseio.com`
