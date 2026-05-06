const { getChannelList, addChannel, removeChannel, logChannelReact, getCoins, updateCoins } = require('../firebase');
const config = require('../config');

// ══════════════════════════════════════════════
//   SASA MD — Channel React System
//   Bot auto-reacts to channels & earns coins
// ══════════════════════════════════════════════

const COINS_PER_REACT = 2;
const OWNER_CHANNEL = {
  link: config.channelLink,
  name: 'SASA MD Official',
  id: '0029Vb7ChKeAojYnYh1uMo3q',
};

// Auto-react when bot receives a channel newsletter message
const handleChannelMessage = async (sock, msg) => {
  try {
    const from = msg.key.remoteJid;
    // Channel newsletter messages have 'newsletter' in jid
    if (!from.includes('newsletter')) return;

    // Check if this channel is in our react list
    const channels = await getChannelList();
    const channelId = from.split('@')[0];
    const channel = channels[channelId] || (from.includes(OWNER_CHANNEL.id) ? OWNER_CHANNEL : null);
    if (!channel?.active && !from.includes(OWNER_CHANNEL.id)) return;

    // React to the message
    const emoji = '❤️';
    await sock.sendMessage(from, {
      react: { text: emoji, key: msg.key }
    });

    // Award coins to all sudo users + owner
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
    await logChannelReact(ownerJid, channelId, COINS_PER_REACT);
    console.log(`📡 Auto-reacted to channel: ${channel?.name || from} — +${COINS_PER_REACT} coins`);
  } catch (err) {
    console.error('Channel react error:', err.message);
  }
};

module.exports = async (sock, msg, args, command) => {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isOwner = sender.replace(/[^0-9]/g, '') === config.ownerNumber.replace(/[^0-9]/g, '');
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  // ── .chanel — list channels ──────────────────
  if (command === 'chanel') {
    const channels = await getChannelList();
    const list = Object.values(channels);
    // Always include owner channel
    const allChannels = [OWNER_CHANNEL, ...list.filter(c => c.id !== OWNER_CHANNEL.id)];
    if (!allChannels.length) return reply('❌ No channels in react list!');
    const txt = allChannels.map((c, i) =>
      `*${i + 1}.* ${c.name}\n   🔗 ${c.link}`
    ).join('\n\n');
    return reply(`*📡 CHANNEL REACT LIST*\n\n${txt}\n\n> Bot automatically reacts to these channels & earns *${COINS_PER_REACT} coins* per react!`);
  }

  // ── .addchanel <link> <name> ─────────────────
  if (command === 'addchanel') {
    if (!isOwner) return reply('❌ Owner only!');
    const link = args[0];
    const name = args.slice(1).join(' ') || 'Channel';
    if (!link?.includes('whatsapp.com/channel/')) return reply('📌 Usage: `.addchanel <channel_link> <name>`');
    await addChannel(link, name);
    return reply(`✅ Channel added to react list!\n📡 *${name}*\nBot will now auto-react to this channel for +${COINS_PER_REACT} coins per react.`);
  }

  // ── .delchanel <id> ──────────────────────────
  if (command === 'delchanel') {
    if (!isOwner) return reply('❌ Owner only!');
    const id = args[0];
    if (!id) return reply('📌 Usage: `.delchanel <channel_id>`');
    await removeChannel(id);
    return reply('✅ Channel removed from react list!');
  }

  // ── .react <channel_link> ────────────────────
  if (command === 'react') {
    const link = args[0];
    if (!link) return reply('📌 Usage: `.react <channel_link>`');
    const coins = await getCoins(sender);
    await logChannelReact(sender, link.split('/').pop(), COINS_PER_REACT);
    return reply(`✅ Reacted! *+${COINS_PER_REACT} coins* earned!\n💰 New balance: *${(coins.balance || 0) + COINS_PER_REACT} coins*`);
  }

  // ── .coins ───────────────────────────────────
  if (command === 'coins') {
    const data = await getCoins(sender);
    const num = sender.replace(/[^0-9]/g, '');
    return reply(`*💰 COIN WALLET*\n\n👤 Number: +${num}\n💎 Balance: *${data.balance || 0} coins*\n📤 Spent: *${data.spent || 0} coins*\n\n> Earn more coins by reacting to channels!\n> Use ${config.prefix}daily for free coins.`);
  }

  // ── .daily ───────────────────────────────────
  if (command === 'daily') {
    const data = await getCoins(sender);
    const today = new Date().toDateString();
    if (data.claimedDaily === today) return reply('❌ Already claimed today! Come back tomorrow.');
    await updateCoins(sender, { balance: (data.balance || 0) + 5, claimedDaily: today });
    return reply(`✅ *Daily coins claimed!* +5 coins\n💰 New balance: *${(data.balance || 0) + 5} coins*`);
  }

  // ── .leaderboard ─────────────────────────────
  if (command === 'leaderboard') {
    return reply(`🏆 *COIN LEADERBOARD*\n\n> Feature coming soon!\n> Keep earning coins by reacting to channels.`);
  }

  // ── .transfer ────────────────────────────────
  if (command === 'transfer') {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const amount = parseInt(args[1]) || parseInt(args[0]);
    if (!mentioned || !amount) return reply('📌 Usage: `.transfer @user <amount>`');
    const data = await getCoins(sender);
    if ((data.balance || 0) < amount) return reply('❌ Insufficient coins!');
    await updateCoins(sender, { balance: (data.balance || 0) - amount, spent: (data.spent || 0) + amount });
    await logChannelReact(mentioned, 'transfer', amount);
    return reply(`✅ Transferred *${amount} coins* to @${mentioned.split('@')[0]}!`);
  }
};

module.exports.handleChannelMessage = handleChannelMessage;
