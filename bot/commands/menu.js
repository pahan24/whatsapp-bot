const config = require('../config');

// ══════════════════════════════════════════════
//   RED QUEEN MD — Menu System
// ══════════════════════════════════════════════

const MENUS = {
  main: (name) => `*🌍⃝⃘̉̉̉━⋆─⋆──❂*
*┊ ┊ ┊ ┊ ┊*
*┊ ┊ ✫ ˚㋛ ⋆｡ ❀*
*┊ ☠︎︎*
*✧  ${name}𓂃✍︎𝄞*
*╰────────────────❂*
*┏━━━━━━━━━━━━━❥❥❥*
*┃*     *🏠 MAIN MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* *𝙾𝚆𝙽𝙴𝚁* - ${config.ownerName}
*┃* *𝚅𝙴𝚁𝚂𝙸𝙾𝙽* - ${config.version}
*┃* *𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂* - ${config.totalCommands}
*┃* *𝙿𝚁𝙴𝙵𝙸𝚇* - [ ${config.prefix} ]
*┃* *𝙰𝙲𝚃𝙸𝚅𝙴 𝙱𝙾𝚃𝚂* - ${config.activeBots}
*┗━━━━━━━━━━━━━❥❥❥*
*┏━「 Reply Number ⤵️ 」*
*┃* *1️⃣ OWNER MENU*
*┃* *2️⃣ SOCIAL MENU*
*┃* *3️⃣ AI MENU*
*┃* *4️⃣ GROUP MENU*
*┃* *5️⃣ TOOLS MENU*
*┃* *6️⃣ EDUCATION MENU*
*┃* *7️⃣ CHANNEL MENU*
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  owner: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *👑 OWNER MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}privacy
*┃* ${config.prefix}setting
*┃* ${config.prefix}getdp
*┃* ${config.prefix}csong
*┃* ${config.prefix}setsudo
*┃* ${config.prefix}delsudo
*┃* ${config.prefix}setcall
*┃* ${config.prefix}delcall
*┃* ${config.prefix}ban
*┃* ${config.prefix}unban
*┃* ${config.prefix}getpass
*┃* ${config.prefix}setpass
*┃* ${config.prefix}broadcast
*┃* ${config.prefix}restart
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  social: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🌐 SOCIAL MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}song
*┃* ${config.prefix}video
*┃* ${config.prefix}fb
*┃* ${config.prefix}tiktok
*┃* ${config.prefix}insta
*┃* ${config.prefix}twitter
*┃* ${config.prefix}movie
*┃* ${config.prefix}apk
*┃* ${config.prefix}img
*┃* ${config.prefix}xnxx *(18+)*
*┃* ${config.prefix}xham *(18+)*
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  ai: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🤖 AI MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}ai <question>
*┃* ${config.prefix}gpt <question>
*┃* ${config.prefix}gemini <question>
*┃* ${config.prefix}imagine <prompt>
*┃* ${config.prefix}aisticker <prompt>
*┃* ${config.prefix}translate <text>
*┃* ${config.prefix}spell <text>
*┃* ${config.prefix}summarize
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  group: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *👥 GROUP MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}add
*┃* ${config.prefix}kick
*┃* ${config.prefix}promote
*┃* ${config.prefix}del
*┃* ${config.prefix}tagadmins
*┃* ${config.prefix}tagall
*┃* ${config.prefix}hidetag
*┃* ${config.prefix}ginfo
*┃* ${config.prefix}glink
*┃* ${config.prefix}grlink
*┃* ${config.prefix}gname
*┃* ${config.prefix}gdec
*┃* ${config.prefix}gdp
*┃* ${config.prefix}grdp
*┃* ${config.prefix}lock / unlock
*┃* ${config.prefix}close / open
*┃* ${config.prefix}addadmin
*┃* ${config.prefix}join / left
*┃* ${config.prefix}gdisappearing
*┃* ${config.prefix}pin / unpin
*┃* ${config.prefix}gsave
*┃* ${config.prefix}ban / unban
*┃* ${config.prefix}ganti
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  tools: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🔧 TOOLS MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}ping
*┃* ${config.prefix}system
*┃* ${config.prefix}alive
*┃* ${config.prefix}menu
*┃* ${config.prefix}bot
*┃* ${config.prefix}sticker
*┃* ${config.prefix}toimg
*┃* ${config.prefix}qr <text>
*┃* ${config.prefix}base64
*┃* ${config.prefix}weather <city>
*┃* ${config.prefix}time <zone>
*┃* ${config.prefix}calc <expr>
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  education: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📚 EDUCATION MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}paper <topic>
*┃* ${config.prefix}wiki <topic>
*┃* ${config.prefix}define <word>
*┃* ${config.prefix}currency <from> <to>
*┃* ${config.prefix}news <topic>
*┃* ${config.prefix}covid
*┃* ${config.prefix}joke
*┃* ${config.prefix}quote
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,

  channel: () => `*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📡 CHANNEL MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${config.prefix}chanel — Channel react list
*┃* ${config.prefix}react <link> — React to channel
*┃* ${config.prefix}coins — View coin balance
*┃* ${config.prefix}daily — Claim daily coins
*┃* ${config.prefix}transfer — Transfer coins
*┃* ${config.prefix}leaderboard — Top coin holders
*┃* ${config.prefix}addchanel — Add channel to react list
*┃* ${config.prefix}delchanel — Remove from react list
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`,
};

module.exports = async (sock, msg, args, command) => {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const pushName = msg.pushName || 'User';
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  if (command === 'menu') {
    const sub = args[0];
    if (!sub) {
      // Show main menu and wait for number reply
      await reply(MENUS.main(pushName));

      // Listen for numbered reply (1-7) for 30 seconds
      const listener = async (ev) => {
        for (const m of ev.messages) {
          if (!m.message || m.key.fromMe) continue;
          if (m.key.remoteJid !== from) continue;
          const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
          const num = body.trim();
          if (['1','2','3','4','5','6','7'].includes(num)) {
            const menuMap = { '1':'owner','2':'social','3':'ai','4':'group','5':'tools','6':'education','7':'channel' };
            await sock.sendMessage(from, { text: MENUS[menuMap[num]]() }, { quoted: m });
            sock.ev.off('messages.upsert', listener);
          }
        }
      };
      setTimeout(() => sock.ev.off('messages.upsert', listener), 30000);
      sock.ev.on('messages.upsert', ({ messages }) => listener({ messages }));
      return;
    }
    // Direct submenu
    const subMap = { owner:'owner', social:'social', ai:'ai', group:'group', tools:'tools', edu:'education', education:'education', channel:'channel' };
    const menuKey = subMap[sub.toLowerCase()];
    if (menuKey) return reply(MENUS[menuKey]());
    return reply(MENUS.main(pushName));
  }

  // Handle numbered replies for menu
  const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (['1','2','3','4','5','6','7'].includes(body.trim())) {
    const menuMap = { '1':'owner','2':'social','3':'ai','4':'group','5':'tools','6':'education','7':'channel' };
    return reply(MENUS[menuMap[body.trim()]]());
  }
};

module.exports.MENUS = MENUS;
