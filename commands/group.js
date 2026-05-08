const { saveGroup, groupBan, groupUnban, isGroupBanned } = require('../firebase');
const config = require('../config');
const axios  = require('axios');

module.exports = async (sock, msg, args, command) => {
  const from   = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const reply  = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  // Commands that work outside group
  const nonGroupCmds = ['join'];
  if (!isGroup && !nonGroupCmds.includes(command)) {
    return reply('❌ This command only works in groups!');
  }

  let groupMeta, isAdmin, isBotAdmin, botId;
  if (isGroup) {
    try {
      groupMeta  = await sock.groupMetadata(from);
      botId      = (sock.user?.id || '').replace(/:\d+@/, '@');
      const me   = groupMeta.participants.find(p => p.id.replace(/:\d+@/, '@') === botId);
      const user = groupMeta.participants.find(p => p.id === sender);
      isBotAdmin = ['admin','superadmin'].includes(me?.admin);
      isAdmin    = ['admin','superadmin'].includes(user?.admin);
    } catch {
      return reply('❌ Could not fetch group info. Make sure bot is in the group.');
    }
  }

  const adminOnly = async () => {
    if (!isAdmin) { await reply('❌ Admins only!'); return false; }
    return true;
  };
  const botAdminOnly = async () => {
    if (!isBotAdmin) { await reply('❌ Make me admin first!'); return false; }
    return true;
  };

  const getMentions = () =>
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    args.map(a => `${a.replace(/\D/g,'')}@s.whatsapp.net`).filter(j => j.length > 15);

  switch (command) {

    // ── add ──────────────────────────────────────────────────
    case 'add': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const num = args[0]?.replace(/\D/g,'');
      if (!num) return reply('📌 Usage: `.add <number>`');
      await sock.groupParticipantsUpdate(from, [`${num}@s.whatsapp.net`], 'add');
      return reply(`✅ Added *${num}* to group!`);
    }

    // ── kick ─────────────────────────────────────────────────
    case 'kick': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const targets = getMentions();
      if (!targets.length) return reply('📌 Usage: `.kick @user`');
      await sock.groupParticipantsUpdate(from, targets, 'remove');
      return reply(`✅ Kicked ${targets.length} member(s)!`);
    }

    // ── promote ──────────────────────────────────────────────
    case 'promote': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const targets = getMentions();
      if (!targets.length) return reply('📌 Usage: `.promote @user`');
      await sock.groupParticipantsUpdate(from, targets, 'promote');
      return reply(`✅ Promoted to admin!`);
    }

    // ── demote ───────────────────────────────────────────────
    case 'demote': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const targets = getMentions();
      if (!targets.length) return reply('📌 Usage: `.demote @user`');
      await sock.groupParticipantsUpdate(from, targets, 'demote');
      return reply(`✅ Demoted from admin!`);
    }

    // ── del ──────────────────────────────────────────────────
    case 'del': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      if (!ctx?.stanzaId) return reply('📌 Reply to a message to delete it!');
      try {
        await sock.sendMessage(from, {
          delete: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }
        });
      } catch { await reply('❌ Could not delete message.'); }
      return;
    }

    // ── tagadmins ────────────────────────────────────────────
    case 'tagadmins': {
      if (!await adminOnly()) return;
      const admins   = groupMeta.participants.filter(p => p.admin);
      const mentions = admins.map(a => a.id);
      const text     = `👑 *Group Admins:*\n${mentions.map(a => `@${a.split('@')[0]}`).join('\n')}`;
      return sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }

    // ── tagall ───────────────────────────────────────────────
    case 'tagall': {
      if (!await adminOnly()) return;
      const all  = groupMeta.participants.map(p => p.id);
      const text = `📢 *Attention Everyone!*\n${args.join(' ') || ''}\n\n${all.map(a => `@${a.split('@')[0]}`).join(' ')}`;
      return sock.sendMessage(from, { text, mentions: all }, { quoted: msg });
    }

    // ── hidetag ──────────────────────────────────────────────
    case 'hidetag': {
      if (!await adminOnly()) return;
      const all  = groupMeta.participants.map(p => p.id);
      const text = args.join(' ') || '📢';
      return sock.sendMessage(from, { text, mentions: all }, { quoted: msg });
    }

    // ── ginfo ────────────────────────────────────────────────
    case 'ginfo': {
      const members = groupMeta.participants.length;
      const admins  = groupMeta.participants.filter(p => p.admin).length;
      return reply(
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📊 GROUP INFO*
*┗━━━━━━━━━━━━━❥❥❥*
*┏━━━━━━━━━━━━━❥❥❥*
*┃* 📛 Name: ${groupMeta.subject}
*┃* 🆔 ID: ${from.split('@')[0]}
*┃* 👥 Members: ${members}
*┃* 👑 Admins: ${admins}
*┃* 📅 Created: ${new Date(groupMeta.creation * 1000).toLocaleDateString()}
*┃* 📝 Desc: ${(groupMeta.desc || 'None').substring(0, 80)}
*┗━━━━━━━━━━━━━❥❥❥*`
      );
    }

    // ── glink ────────────────────────────────────────────────
    case 'glink': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const code = await sock.groupInviteCode(from);
      return reply(`🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}`);
    }

    // ── grlink ───────────────────────────────────────────────
    case 'grlink': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      await sock.groupRevokeInvite(from);
      const newCode = await sock.groupInviteCode(from);
      return reply(`✅ Link reset!\n🔗 New: https://chat.whatsapp.com/${newCode}`);
    }

    // ── gname ────────────────────────────────────────────────
    case 'gname': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const name = args.join(' ');
      if (!name) return reply('📌 Usage: `.gname <new name>`');
      await sock.groupUpdateSubject(from, name);
      return reply(`✅ Group renamed to *${name}*!`);
    }

    // ── gdec ─────────────────────────────────────────────────
    case 'gdec': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const desc = args.join(' ');
      if (!desc) return reply('📌 Usage: `.gdec <description>`');
      await sock.groupUpdateDescription(from, desc);
      return reply('✅ Group description updated!');
    }

    // ── gdp ──────────────────────────────────────────────────
    case 'gdp': {
      if (!await botAdminOnly()) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const img = ctx?.quotedMessage?.imageMessage;
      if (!img) return reply('📌 Reply to an image to set as group photo!');
      try {
        const stream = await sock.downloadContentFromMessage(img, 'image');
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        await sock.updateProfilePicture(from, buf);
        return reply('✅ Group photo updated!');
      } catch { return reply('❌ Could not update group photo.'); }
    }

    // ── grdp ─────────────────────────────────────────────────
    case 'grdp': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      try {
        await sock.removeProfilePicture(from);
        return reply('✅ Group photo removed!');
      } catch { return reply('❌ Could not remove group photo.'); }
    }

    // ── lock / unlock ─────────────────────────────────────────
    case 'lock': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      await sock.groupSettingUpdate(from, 'announcement');
      return reply('🔒 Group *locked* — only admins can send messages!');
    }
    case 'unlock': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      await sock.groupSettingUpdate(from, 'not_announcement');
      return reply('🔓 Group *unlocked* — all members can send messages!');
    }

    // ── close / open ──────────────────────────────────────────
    case 'close': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      await sock.groupSettingUpdate(from, 'locked');
      return reply('🚫 Group *closed*!');
    }
    case 'open': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      await sock.groupSettingUpdate(from, 'unlocked');
      return reply('✅ Group *opened*!');
    }

    // ── join ─────────────────────────────────────────────────
    case 'join': {
      const link = args[0];
      if (!link) return reply('📌 Usage: `.join <group invite link>`');
      const code = link.split('https://chat.whatsapp.com/')[1];
      if (!code) return reply('❌ Invalid group link!');
      try {
        await sock.groupAcceptInvite(code);
        return reply('✅ Joined group!');
      } catch { return reply('❌ Could not join group. Link may be invalid or expired.'); }
    }

    // ── left ─────────────────────────────────────────────────
    case 'left': {
      if (!await adminOnly()) return;
      await reply('👋 Leaving group... Goodbye!');
      await sock.groupLeave(from);
      return;
    }

    // ── gdisappearing ─────────────────────────────────────────
    case 'gdisappearing': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const secs = args[0] === 'off' ? 0 : parseInt(args[0]) || 86400;
      await sock.groupToggleEphemeral(from, secs);
      return reply(`⏳ Disappearing messages ${secs === 0 ? 'disabled' : `set to ${secs}s`}!`);
    }

    // ── pin ──────────────────────────────────────────────────
    case 'pin': {
      if (!await adminOnly()) return;
      return reply('📌 To pin: use WhatsApp\'s built-in pin feature on the message.');
    }

    // ── gsave ────────────────────────────────────────────────
    case 'gsave': {
      if (!await adminOnly()) return;
      await saveGroup(from, {
        subject: groupMeta.subject,
        desc:    groupMeta.desc,
        members: groupMeta.participants.map(p => p.id),
      });
      return reply(`✅ Group saved to database!\n👥 ${groupMeta.participants.length} members saved.`);
    }

    // ── gban / gunban ─────────────────────────────────────────
    case 'gban': {
      if (!await adminOnly() || !await botAdminOnly()) return;
      const targets = getMentions();
      if (!targets.length) return reply('📌 Usage: `.gban @user`');
      for (const t of targets) await groupBan(from, t);
      await sock.groupParticipantsUpdate(from, targets, 'remove');
      return reply(`🚫 Banned ${targets.length} user(s) from this group!`);
    }
    case 'gunban': {
      if (!await adminOnly()) return;
      const targets = getMentions();
      if (!targets.length) return reply('📌 Usage: `.gunban @user`');
      for (const t of targets) await groupUnban(from, t);
      return reply(`✅ Unbanned ${targets.length} user(s)!`);
    }
  }
};
