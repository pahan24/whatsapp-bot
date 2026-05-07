const config = require('../config');

const p = config.prefix;

const MENUS = {
  main: (name) =>
`*🌍⃝⃘̉̉̉━⋆─⋆──❂*
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
*┃* *𝙿𝚁𝙴𝙵𝙸𝚇* - [ ${p} ]
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

  '1': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *👑 OWNER MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}privacy
*┃* ${p}setting
*┃* ${p}getdp
*┃* ${p}setsudo
*┃* ${p}delsudo
*┃* ${p}setcall
*┃* ${p}delcall
*┃* ${p}ban
*┃* ${p}unban
*┃* ${p}getpass
*┃* ${p}setprefix
*┃* ${p}broadcast
*┃* ${p}restart
*┃* ${p}shutdown
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '2': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🌐 SOCIAL MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}song <name/url>
*┃* ${p}video <name/url>
*┃* ${p}fb <url>
*┃* ${p}tiktok <url>
*┃* ${p}insta <url>
*┃* ${p}twitter <url>
*┃* ${p}movie <name>
*┃* ${p}apk <name>
*┃* ${p}img <query>
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '3': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🤖 AI MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}ai <question>
*┃* ${p}gpt <question>
*┃* ${p}gemini <question>
*┃* ${p}imagine <prompt>
*┃* ${p}translate <text>
*┃* ${p}spell <text>
*┃* ${p}summarize
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '4': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *👥 GROUP MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}add / ${p}kick
*┃* ${p}promote / ${p}demote
*┃* ${p}del
*┃* ${p}tagadmins
*┃* ${p}tagall
*┃* ${p}hidetag
*┃* ${p}ginfo
*┃* ${p}glink
*┃* ${p}grlink
*┃* ${p}gname
*┃* ${p}gdec
*┃* ${p}gdp / ${p}grdp
*┃* ${p}lock / ${p}unlock
*┃* ${p}close / ${p}open
*┃* ${p}join / ${p}left
*┃* ${p}gdisappearing
*┃* ${p}pin / ${p}unpin
*┃* ${p}gsave
*┃* ${p}gban / ${p}gunban
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '5': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🔧 TOOLS MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}ping
*┃* ${p}system
*┃* ${p}alive
*┃* ${p}menu
*┃* ${p}bot
*┃* ${p}sticker (reply image)
*┃* ${p}toimg (reply sticker)
*┃* ${p}qr <text>
*┃* ${p}calc <expression>
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '6': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📚 EDUCATION MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}paper <topic>
*┃* ${p}wiki <topic>
*┃* ${p}define <word>
*┃* ${p}news <topic>
*┃* ${p}joke
*┃* ${p}quote
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,

  '7': () =>
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📡 CHANNEL MENU*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* ${p}chanel
*┃* ${p}addchanel <link> <name>
*┃* ${p}delchanel <id>
*┃* ${p}react <link>
*┃* ${p}coins
*┃* ${p}daily
*┃* ${p}transfer @user <amount>
*┃* ${p}leaderboard
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`,
};

const NUM_MAP = { '1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7' };

module.exports = async (sock, msg, args, command) => {
  const from  = msg.key.remoteJid;
  const name  = msg.pushName || 'User';
  const send  = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  if (command === 'menu') {
    const sub = args[0];
    if (sub && MENUS[sub]) return send(MENUS[sub]());
    await send(MENUS.main(name));

    // Listen for number reply (1-7) for 30 seconds
    const handler = async ({ messages }) => {
      for (const m of messages) {
        if (!m.message || m.key.fromMe || m.key.remoteJid !== from) continue;
        const body = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim();
        if (NUM_MAP[body]) {
          await sock.sendMessage(from, { text: MENUS[body]() }, { quoted: m });
          sock.ev.off('messages.upsert', handler);
        }
      }
    };
    const timeout = setTimeout(() => sock.ev.off('messages.upsert', handler), 30000);
    sock.ev.on('messages.upsert', handler);
    return;
  }

  // Direct number reply if no active listener
  if (MENUS[command]) return send(MENUS[command]());
};

module.exports.MENUS = MENUS;
