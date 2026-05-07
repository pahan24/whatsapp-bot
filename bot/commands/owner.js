const { addSudo, removeSudo, banUser, unbanUser, addCallBlock, removeCallBlock, setSetting, saveWebPass } = require('../firebase');
const config = require('../config');
const axios  = require('axios');
const os     = require('os');

const isOwner = (jid) =>
  jid.replace(/[^0-9]/g, '') === config.ownerNumber.replace(/[^0-9]/g, '');

const isSudoOrOwner = async (jid, { isSudo }) =>
  isOwner(jid) || await isSudo(jid);

module.exports = async (sock, msg, args, command) => {
  const from   = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const reply  = (text) => sock.sendMessage(from, { text }, { quoted: msg });
  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const target  = mention || (args[0] ? `${args[0].replace(/\D/g,'')}@s.whatsapp.net` : null);

  const ownerOnly = async () => {
    if (!isOwner(sender)) { await reply('❌ *Owner only command!*'); return false; }
    return true;
  };

  switch (command) {

    // ── privacy ────────────────────────────────────────────────
    case 'privacy': {
      if (!await ownerOnly()) return;
      const mode = args[0]?.toLowerCase();
      if (!['everyone','contacts','none'].includes(mode))
        return reply('📌 Usage: `.privacy everyone | contacts | none`');
      try {
        await sock.updatePrivacySettings('last_seen', mode === 'none' ? 'none' : mode);
        await sock.updatePrivacySettings('profile', mode === 'none' ? 'none' : mode);
        await sock.updatePrivacySettings('status', mode === 'none' ? 'none' : mode);
        await setSetting('privacy', mode);
        return reply(`✅ Privacy set to *${mode}*`);
      } catch { return reply(`✅ Privacy command sent: ${mode}`); }
    }

    // ── getdp ──────────────────────────────────────────────────
    case 'getdp': {
      if (!await ownerOnly()) return;
      const t = target || sender;
      try {
        const url = await sock.profilePictureUrl(t, 'image');
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        await sock.sendMessage(from, {
          image: Buffer.from(res.data),
          caption: `📸 Profile photo of @${t.split('@')[0]}`,
          mentions: [t],
        }, { quoted: msg });
      } catch { await reply('❌ No profile photo found!'); }
      return;
    }

    // ── setsudo ────────────────────────────────────────────────
    case 'setsudo': {
      if (!await ownerOnly()) return;
      if (!target) return reply('📌 Usage: `.setsudo @user`');
      await addSudo(target);
      return reply(`✅ @${target.split('@')[0]} added as sudo!`, { mentions: [target] });
    }

    // ── delsudo ────────────────────────────────────────────────
    case 'delsudo': {
      if (!await ownerOnly()) return;
      if (!target) return reply('📌 Usage: `.delsudo @user`');
      await removeSudo(target);
      return reply(`✅ @${target.split('@')[0]} removed from sudo!`);
    }

    // ── setcall ────────────────────────────────────────────────
    case 'setcall': {
      if (!await ownerOnly()) return;
      await setSetting('callReject', true);
      return reply('✅ Call reject enabled!');
    }

    // ── delcall ────────────────────────────────────────────────
    case 'delcall': {
      if (!await ownerOnly()) return;
      await setSetting('callReject', false);
      return reply('✅ Call reject disabled!');
    }

    // ── ban ────────────────────────────────────────────────────
    case 'ban': {
      if (!await ownerOnly()) return;
      if (!target) return reply('📌 Usage: `.ban @user [reason]`');
      const reason = args.slice(1).join(' ') || 'Violation';
      await banUser(target, reason);
      return reply(`🚫 @${target.split('@')[0]} banned!\nReason: ${reason}`);
    }

    // ── unban ──────────────────────────────────────────────────
    case 'unban': {
      if (!await ownerOnly()) return;
      if (!target) return reply('📌 Usage: `.unban @user`');
      await unbanUser(target);
      return reply(`✅ @${target.split('@')[0]} unbanned!`);
    }

    // ── getpass ────────────────────────────────────────────────
    case 'getpass': {
      const num  = sender.replace(/[^0-9]/g, '');
      const pass = config.generateWebPass(num);
      await saveWebPass(sender, pass);
      return reply(`🔐 *Your Web Password:*\n\`${pass}\`\n\n🌐 Use this to login at the bot website.\n🛠 Settings, Auto Reply, Coins & more.`);
    }

    // ── setprefix ──────────────────────────────────────────────
    case 'setprefix': {
      if (!await ownerOnly()) return;
      const np = args[0];
      if (!np || np.length > 2) return reply('📌 Usage: `.setprefix .`');
      await setSetting('prefix', np);
      return reply(`✅ Prefix changed to *${np}*\n(Restart bot to apply)`);
    }

    // ── broadcast ──────────────────────────────────────────────
    case 'broadcast': {
      if (!await ownerOnly()) return;
      const text = args.join(' ');
      if (!text) return reply('📌 Usage: `.broadcast <message>`');
      await reply('📢 Broadcasting... (saves to all known chats)');
      return;
    }

    // ── restart ────────────────────────────────────────────────
    case 'restart': {
      if (!await ownerOnly()) return;
      await reply('🔄 Restarting SASA MD...');
      setTimeout(() => process.exit(0), 1500);
      return;
    }

    // ── shutdown ───────────────────────────────────────────────
    case 'shutdown': {
      if (!await ownerOnly()) return;
      await reply('🛑 Shutting down SASA MD...');
      setTimeout(() => process.exit(1), 1500);
      return;
    }

    // ── setting ────────────────────────────────────────────────
    case 'setting': {
      if (!await ownerOnly()) return;
      return reply(`⚙️ *BOT SETTINGS*\n\nVisit the bot website to configure:\n\n🌐 Bot dashboard\n🔒 Privacy settings\n🤖 Auto reply\n💰 Coin system\n\nUse *.getpass* to get your login password.`);
    }
  }
};
