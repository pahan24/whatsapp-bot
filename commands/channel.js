const {
  getChannelList, addChannel, removeChannel,
  logChannelReact, getCoins, updateCoins, addCoins,
} = require('../firebase');
const config = require('../config');

const OWNER_CHANNEL = {
  id:   '0029Vb7ChKeAojYnYh1uMo3q',
  link: config.channelLink,
  name: 'SASA MD Official',
  active: true,
};
const COINS_PER_REACT = 2;
const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;

// Called from index.js when a newsletter/channel message arrives
const handleChannelMessage = async (sock, msg) => {
  try {
    const from = msg.key.remoteJid;
    if (!from?.includes('@newsletter')) return;

    const channels = await getChannelList() || {};
    const channelId = from.split('@')[0];
    const isOwnerCh = from.includes(OWNER_CHANNEL.id);
    const registered = channels[channelId];

    if (!registered?.active && !isOwnerCh) return;

    // React with emoji
    await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } });

    // Award coins to owner
    await logChannelReact(OWNER_JID, channelId, COINS_PER_REACT);
    console.log(`📡 Reacted to channel ${channelId} — +${COINS_PER_REACT} coins`);
  } catch (err) {
    console.error('Channel react error:', err.message);
  }
};

module.exports = async (sock, msg, args, command) => {
  const from   = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isOwner = sender.replace(/\D/g, '') === config.ownerNumber.replace(/\D/g, '');
  const reply  = (text) => sock.sendMessage(from, { text }, { quoted: msg });
  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  switch (command) {

    // ── .chanel ──────────────────────────────────────────────
    case 'chanel': {
      const raw = await getChannelList() || {};
      const list = [OWNER_CHANNEL, ...Object.values(raw).filter(c => c.id !== OWNER_CHANNEL.id)];
      const txt  = list.map((c, i) =>
        `*${i + 1}.* ${c.name}\n   🔗 ${c.link}`
      ).join('\n\n');
      return reply(
`*┏━━━━━━━━━━━━━❥❥❥*
*┃* *📡 CHANNEL REACT LIST*
*┗━━━━━━━━━━━━━❥❥❥*

${txt}

💰 Bot earns *+${COINS_PER_REACT} coins* per react!
> Auto-react is active 24/7`
      );
    }

    // ── .addchanel <link> <name> ──────────────────────────────
    case 'addchanel': {
      if (!isOwner) return reply('❌ Owner only!');
      const link = args[0];
      const name = args.slice(1).join(' ') || 'Channel';
      if (!link?.includes('whatsapp.com/channel/'))
        return reply('📌 Usage: `.addchanel <channel_link> <name>`');
      await addChannel(link, name);
      return reply(`✅ *${name}* added to react list!\nBot will now auto-react for +${COINS_PER_REACT} coins.`);
    }

    // ── .delchanel <id> ───────────────────────────────────────
    case 'delchanel': {
      if (!isOwner) return reply('❌ Owner only!');
      const id = args[0];
      if (!id) return reply('📌 Usage: `.delchanel <channel_id>`');
      await removeChannel(id);
      return reply('✅ Channel removed from react list!');
    }

    // ── .react <link> ─────────────────────────────────────────
    case 'react': {
      const link = args[0];
      if (!link) return reply('📌 Usage: `.react <channel_link>`');
      await logChannelReact(sender, link.split('/').pop(), COINS_PER_REACT);
      const data = await getCoins(sender);
      return reply(`✅ Reacted! *+${COINS_PER_REACT} coins* earned!\n💰 Balance: *${data.balance} coins*`);
    }

    // ── .coins ────────────────────────────────────────────────
    case 'coins': {
      const data = await getCoins(sender);
      const num  = sender.replace(/\D/g, '');
      return reply(
`*💰 COIN WALLET*

👤 Number: +${num}
💎 Balance: *${data.balance || 0} coins*
📤 Spent:   *${data.spent   || 0} coins*

> Earn coins by reacting to channels!
> Use ${config.prefix}daily for free coins.`
      );
    }

    // ── .daily ────────────────────────────────────────────────
    case 'daily': {
      const data  = await getCoins(sender);
      const today = new Date().toDateString();
      if (data.claimedDaily === today)
        return reply('❌ Already claimed today!\nCome back tomorrow for more coins.');
      await updateCoins(sender, { balance: (data.balance || 0) + 5, claimedDaily: today });
      return reply(`✅ *Daily coins claimed! +5 coins*\n💰 New balance: *${(data.balance || 0) + 5} coins*`);
    }

    // ── .transfer @user <amount> ──────────────────────────────
    case 'transfer': {
      const target = mention || (args[0] ? `${args[0].replace(/\D/g,'')}@s.whatsapp.net` : null);
      const amount = parseInt(args[mention ? 0 : 1]);
      if (!target || !amount || amount <= 0)
        return reply('📌 Usage: `.transfer @user <amount>`');
      const sData = await getCoins(sender);
      if ((sData.balance || 0) < amount)
        return reply(`❌ Insufficient coins! Your balance: *${sData.balance || 0}*`);
      await updateCoins(sender, {
        balance: (sData.balance || 0) - amount,
        spent:   (sData.spent   || 0) + amount,
      });
      await addCoins(target, amount);
      return reply(
        `✅ Transferred *${amount} coins* to @${target.split('@')[0]}!`,
        { mentions: [target] }
      );
    }

    // ── .leaderboard ──────────────────────────────────────────
    case 'leaderboard': {
      return reply(
`🏆 *COIN LEADERBOARD*

> Feature available on the bot website!
> Visit the Coin page to see top earners.

💰 Keep earning coins by:
• Reacting to channels (${config.prefix}react)
• Daily claims (${config.prefix}daily)
• Auto-react (bot does it automatically)`
      );
    }
  }
};

module.exports.handleChannelMessage = handleChannelMessage;
