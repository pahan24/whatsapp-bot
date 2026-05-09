require('dotenv').config();

const ownerNumber = process.env.OWNER_NUMBER || '94727114552';

const generateWebPass = (number) => {
  const seed = number.replace(/\D/g, '');
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pw = 'SM';
  let h  = hash;
  for (let i = 0; i < 6; i++) {
    pw += chars[h % chars.length];
    h   = Math.floor(h / chars.length) || hash + i + 1;
  }
  return pw;
};

module.exports = {
  botName:       process.env.BOT_NAME    || 'SASA MD',
  prefix:        process.env.PREFIX      || '.',
  ownerNumber,
  ownerName:     process.env.OWNER_NAME  || 'PAHAN',
  version:       '5.2.0',
  totalCommands: 93,
  activeBots:    3650,
  channelLink:   'https://whatsapp.com/channel/0029Vb7ChKeAojYnYh1uMo3q',
  sessionId:     'sasa_md_session',
  webPassword:   process.env.WEB_PASSWORD || 'sasa123',

  // Heroku uses process.env.PORT
  port: parseInt(process.env.PORT) || 3000,

  autoRead:   process.env.AUTO_READ   !== 'false',
  autoTyping: process.env.AUTO_TYPING !== 'false',

  generateWebPass,
  getOwnerPass: () => generateWebPass(ownerNumber),

  // ── Sinhala connect message ─────────────────────────────────
  connectMsg: (pass) =>
`> *බොට් සම්බන්ධ වෙමින් පවතී... 🔄*

*කරුණාකර මිනිත්තු 5ක් රැඳී සිටින්න... ⏳*
 _ඉන්පසු .alive විධානය භාවිතා කරන්න_

*මිනිත්තු 5කට පසු කිසිදු ප්‍රතිචාරයක් නොලැබේ නම් පමණක්:*
 _කරුණාකර ඔබේ උපාංගය නැවත සම්බන්ධ කරන්න ( ʀᴇ-ʟɪɴᴋ ᴅᴇᴠɪᴄᴇ ) 🔁_

🔐 *ඔබේ මුරපදය:* \`${pass}\`
🛠 *සැකසුම් වෙනස් කිරීමට මෙම මුරපදය භාවිතා කරන්න*`,

  // ── Unknown number auto-reply ───────────────────────────────
  unknownMsg: (name) =>
`*🌍⃝⃘̉̉̉━⋆─⋆──❂*
*┊ ┊ ┊ ┊ ┊*
*┊ ┊ ✫ ˚㋛ ⋆｡ ❀*
*┊ ☠︎︎*
*✧  ${name}𓂃✍︎𝄞*
*╰────────────────❂*

👋 *ආයුබෝවන් ${name}!*

ඔබ *SASA MD Bot* එකට message කර ඇත.

🤖 *Bot Info:*
• Bot: SASA MD v5.2.0
• Owner: PAHAN

✅ *ඔබේ message save කර ඇත!*
📞 Owner හා කතා කිරීමට: wa.me/94727114552

> _Powered by SASA MD_`,
};
