require('dotenv').config();

module.exports = {
  botName: process.env.BOT_NAME || 'SASA MD',
  prefix: process.env.PREFIX || '.',
  ownerNumber: process.env.OWNER_NUMBER || '94727114552',
  ownerName: process.env.OWNER_NAME || 'PAHAN',
  version: '5.2.0',
  totalCommands: 93,
  activeBots: 3650,
  channelLink: 'https://whatsapp.com/channel/0029Vb7ChKeAojYnYh1uMo3q',
  sessionId: process.env.SESSION_ID || 'sasabot_session',
  pairPort: parseInt(process.env.PAIR_PORT) || 3000,
  autoRead: process.env.AUTO_READ !== 'false',
  autoTyping: process.env.AUTO_TYPING !== 'false',
  webPassword: process.env.WEB_PASSWORD || 'RQ2025',

  // ── CONNECT MESSAGE (Sinhala) ──────────────────────────────────
  connectMsg: (password) => `> *බොට් සම්බන්ධ වෙමින් පවතී... 🔄*

*කරුණාකර මිනිත්තු 5ක් රැඳී සිටින්න... ⏳*
 _ඉන්පසු .alive විධානය භාවිතා කරන්න_

*මිනිත්තු 5කට පසු කිසිදු ප්‍රතිචාරයක් නොලැබේ නම් පමණක්:*
 _කරුණාකර ඔබේ උපාංගය නැවත සම්බන්ධ කරන්න ( ʀᴇ-ʟɪɴᴋ ᴅᴇᴠɪᴄᴇ ) 🔁_

🔐 *ඔබේ මුරපදය:* \`${password}\`
🛠 *සැකසුම් වෙනස් කිරීමට මෙම මුරපදය භාවිතා කරන්න*`,

  // ── UNKNOWN NUMBER AUTO REPLY ──────────────────────────────────
  unknownMsg: (name, number) => `*🌍⃝⃘̉̉̉━⋆─⋆──❂*
*┊ ┊ ┊ ┊ ┊*
*┊ ┊ ✫ ˚㋛ ⋆｡ ❀*
*┊ ☠︎︎*
*✧  ${name}𓂃✍︎𝄞*
*╰────────────────❂*

👋 *ආයුබෝවන් ${name}!*

ඔබ SASA MD Bot එකට message කර ඇත.

🤖 *Bot Info:*
• Owner: PAHAN
• Number: +94727114552

📞 *ඔබ owner ව contact කිරීමට:*
wa.me/94727114552

✅ *ඔබේ message save කර ඇත!*
> _Powered by SASA MD_`,
};
