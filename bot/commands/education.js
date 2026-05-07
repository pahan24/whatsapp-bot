const axios  = require('axios');
const config = require('../config');

module.exports = async (sock, msg, args, command) => {
  const from  = msg.key.remoteJid;
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });
  const q     = args.join(' ');

  switch (command) {

    // ── .paper ───────────────────────────────────────────────
    case 'paper': {
      if (!q) return reply('📌 Usage: `.paper <topic>`\nEx: `.paper machine learning`');
      await reply('📖 Searching academic papers...');
      try {
        const res = await axios.get(
          `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=3`,
          { timeout: 15000 }
        );
        const entries = res.data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
        if (!entries.length) return reply(`❌ No papers found for: *${q}*`);
        let out = `📚 *Academic Papers — "${q}"*\n${'─'.repeat(28)}\n\n`;
        entries.slice(0, 3).forEach((e, i) => {
          const title   = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Unknown').trim().replace(/\n/g, ' ');
          const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').trim().replace(/\n/g, ' ').substring(0, 120);
          const link    = e.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || '';
          const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => m[1]).slice(0, 2).join(', ');
          out += `*${i + 1}. ${title}*\n👤 ${authors}\n📝 ${summary}...\n🔗 ${link}\n\n`;
        });
        return reply(out);
      } catch { return reply('❌ Paper search failed. Try again later.'); }
    }

    // ── .wiki ────────────────────────────────────────────────
    case 'wiki': {
      if (!q) return reply('📌 Usage: `.wiki <topic>`');
      try {
        const res = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
          { timeout: 10000 }
        );
        const { title, extract, content_urls } = res.data;
        return reply(`📖 *${title}*\n\n${extract?.substring(0, 400)}...\n\n🔗 ${content_urls?.desktop?.page}`);
      } catch { return reply(`❌ Wikipedia article not found for: *${q}*`); }
    }

    // ── .define ──────────────────────────────────────────────
    case 'define': {
      if (!q) return reply('📌 Usage: `.define <word>`');
      try {
        const res = await axios.get(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`,
          { timeout: 10000 }
        );
        const entry = res.data[0];
        const meanings = entry.meanings.slice(0, 2).map(m => {
          const def = m.definitions[0];
          return `*${m.partOfSpeech}:* ${def.definition}${def.example ? `\n_"${def.example}"_` : ''}`;
        }).join('\n\n');
        return reply(`📘 *${entry.word}*\n\n${meanings}`);
      } catch { return reply(`❌ Definition not found for: *${q}*`); }
    }

    // ── .joke ────────────────────────────────────────────────
    case 'joke': {
      try {
        const res = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 8000 });
        return reply(`😄 *${res.data.setup}*\n\n${res.data.punchline} 😂`);
      } catch { return reply('😄 Why do programmers prefer dark mode?\n\nBecause light attracts bugs! 🐛'); }
    }

    // ── .quote ───────────────────────────────────────────────
    case 'quote': {
      try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 8000 });
        return reply(`💬 *"${res.data.content}"*\n\n— _${res.data.author}_`);
      } catch {
        const quotes = [
          ['The only way to do great work is to love what you do.', 'Steve Jobs'],
          ['In the middle of difficulty lies opportunity.', 'Albert Einstein'],
          ['It does not matter how slowly you go as long as you do not stop.', 'Confucius'],
        ];
        const [q, a] = quotes[Math.floor(Math.random() * quotes.length)];
        return reply(`💬 *"${q}"*\n\n— _${a}_`);
      }
    }

    // ── .news ────────────────────────────────────────────────
    case 'news': {
      return reply(`📰 *News feature:*\nVisit: https://news.google.com/search?q=${encodeURIComponent(q || 'latest')}`);
    }
  }
};
