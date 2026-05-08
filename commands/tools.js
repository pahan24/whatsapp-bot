const os     = require('os');
const config = require('../config');

module.exports = async (sock, msg, args, command) => {
  const from  = msg.key.remoteJid;
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  switch (command) {

    // ── ping ──────────────────────────────────────────────────
    case 'ping': {
      const start = Date.now();
      const m = await sock.sendMessage(from, { text: '🏓 Pinging...' }, { quoted: msg });
      const ms = Date.now() - start;
      await sock.sendMessage(from, { text: `🏓 *Pong!*\n⚡ Speed: *${ms}ms*\n✅ Bot is online!` }, { quoted: msg });
      return;
    }

    // ── alive ─────────────────────────────────────────────────
    case 'alive': {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      return reply(
`*🌍⃝⃘̉̉̉━⋆─⋆──❂*
*┊ ┊ ┊ ┊ ┊*
*┊ ✫ SASA MD ✫*
*╰────────────────❂*

✅ *Bot is ALIVE!*

*┏━━━━━━━━━━━━━❥❥❥*
*┃* 🤖 Bot: ${config.botName}
*┃* 👑 Owner: ${config.ownerName}
*┃* ⚡ Prefix: [ ${config.prefix} ]
*┃* 🔢 Version: ${config.version}
*┃* ⏱️ Uptime: ${h}h ${m}m ${s}s
*┃* 🌐 Status: Online ✅
*┗━━━━━━━━━━━━━❥❥❥*

> *Powered by ${config.ownerName}*`
      );
    }

    // ── system ────────────────────────────────────────────────
    case 'system': {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      const mem = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem  = os.freemem();
      const usedMem  = totalMem - freeMem;
      return reply(
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *💻 SYSTEM INFO*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* 🤖 Bot: ${config.botName}
*┃* 🖥️ OS: ${os.type()} ${os.arch()}
*┃* 💾 RAM: ${(usedMem/1024/1024).toFixed(1)}MB / ${(totalMem/1024/1024).toFixed(1)}MB
*┃* 🧠 Heap: ${(mem.heapUsed/1024/1024).toFixed(1)}MB
*┃* ⏱️ Uptime: ${h}h ${m}m ${s}s
*┃* 🟢 Node: ${process.version}
*┃* 📡 Platform: ${os.platform()}
*┃* 💿 CPU: ${os.cpus()[0]?.model?.split(' ').slice(0,3).join(' ')}
*┗━━━━━━━━━━━━━❥❥❥*
> *Powered by ${config.ownerName}*`
      );
    }

    // ── bot ───────────────────────────────────────────────────
    case 'bot': {
      return reply(
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *🤖 BOT INFO*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* 📛 Name: ${config.botName}
*┃* 👑 Owner: ${config.ownerName}
*┃* ⚡ Prefix: [ ${config.prefix} ]
*┃* 🔢 Version: ${config.version}
*┃* 📋 Commands: ${config.totalCommands}
*┃* 🌐 Channel: ${config.channelLink}
*┗━━━━━━━━━━━━━❥❥❥*

> *Type ${config.prefix}menu for all commands!*`
      );
    }

    // ── calc ──────────────────────────────────────────────────
    case 'calc': {
      const expr = args.join(' ');
      if (!expr) return reply('📌 Usage: `.calc 2+2`');
      try {
        // Safe eval - only allow math chars
        if (/[^0-9+\-*/.() %]/.test(expr)) return reply('❌ Invalid expression!');
        const result = Function(`"use strict"; return (${expr})`)();
        return reply(`🧮 *${expr}* = *${result}*`);
      } catch {
        return reply('❌ Invalid math expression!');
      }
    }

    // ── sticker ───────────────────────────────────────────────
    case 'sticker': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const img = quoted?.imageMessage || (msg.message?.imageMessage);
      if (!img) return reply('📌 Reply to an image to convert to sticker!');
      try {
        const stream = await sock.downloadContentFromMessage(img, 'image');
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        await sock.sendMessage(from, { sticker: buf }, { quoted: msg });
      } catch { await reply('❌ Could not convert to sticker!'); }
      return;
    }

    // ── toimg ─────────────────────────────────────────────────
    case 'toimg': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const stk = quoted?.stickerMessage;
      if (!stk) return reply('📌 Reply to a sticker to convert to image!');
      try {
        const stream = await sock.downloadContentFromMessage(stk, 'sticker');
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        await sock.sendMessage(from, { image: buf, caption: '🖼️ Converted from sticker' }, { quoted: msg });
      } catch { await reply('❌ Could not convert to image!'); }
      return;
    }
  }
};
