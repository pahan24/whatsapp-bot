/**
 * SASA MD — Get Session for Heroku
 * ════════════════════════════════════
 * Run this AFTER pairing your bot locally:
 *   node getsession.js
 *
 * Then copy the SESSION_DATA value into:
 *   Heroku → Settings → Config Vars → SESSION_DATA
 */

const fs   = require('fs');
const path = require('path');

const SESSION_FOLDER = path.join(__dirname, 'sessions', 'sasa_md_session');

if (!fs.existsSync(SESSION_FOLDER)) {
  console.error('❌ Session folder not found!');
  console.error('   Please pair the bot first using: node index.js');
  process.exit(1);
}

const files = fs.readdirSync(SESSION_FOLDER);
if (!files.length) {
  console.error('❌ No session files found. Pair the bot first!');
  process.exit(1);
}

const sessionData = {};
for (const file of files) {
  const content = fs.readFileSync(path.join(SESSION_FOLDER, file), 'utf8');
  sessionData[file] = content;
}

const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');

console.log('\n✅ Session extracted successfully!\n');
console.log('📋 Copy this value to Heroku Config Vars as SESSION_DATA:\n');
console.log('━'.repeat(60));
console.log(encoded);
console.log('━'.repeat(60));
console.log('\n🔗 Heroku → Your App → Settings → Config Vars → Add:');
console.log('   Key:   SESSION_DATA');
console.log('   Value: (paste the above string)\n');
