const axios  = require('axios');
const config = require('../config');

const reply = (sock, from, msg, text) => sock.sendMessage(from, { text }, { quoted: msg });

const downloadBuffer = async (url) => {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
};

module.exports = async (sock, msg, args, command) => {
  const from = msg.key.remoteJid;
  const send = (text) => reply(sock, from, msg, text);
  const q    = args.join(' ');

  switch (command) {

    // ── song ─────────────────────────────────────────────────
    case 'song': {
      if (!q) return send('📌 Usage: `.song <song name or YouTube URL>`');
      await send('🎵 Searching for song...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/song?query=${encodeURIComponent(q)}&apikey=free`,
          { timeout: 20000 }
        );
        if (!res.data?.data) return send('❌ Song not found! Try a different name.');
        const { title, duration, size, url } = res.data.data;
        const buf = await downloadBuffer(url);
        await sock.sendMessage(from, {
          audio: buf, mimetype: 'audio/mpeg', fileName: `${title}.mp3`,
        }, { quoted: msg });
        await send(`✅ *${title}*\n⏱️ Duration: ${duration}\n📦 Size: ${size}`);
      } catch (e) {
        await send(`❌ Song download failed.\nTip: Try a shorter song name or YouTube URL.`);
      }
      return;
    }

    // ── video ─────────────────────────────────────────────────
    case 'video': {
      if (!q) return send('📌 Usage: `.video <video name or YouTube URL>`');
      await send('🎬 Searching for video...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/youtube?query=${encodeURIComponent(q)}&type=mp4&apikey=free`,
          { timeout: 30000 }
        );
        if (!res.data?.data) return send('❌ Video not found!');
        const { title, duration, url } = res.data.data;
        const buf = await downloadBuffer(url);
        await sock.sendMessage(from, {
          video: buf, mimetype: 'video/mp4',
          caption: `🎬 *${title}*\n⏱️ ${duration}`,
        }, { quoted: msg });
      } catch {
        await send('❌ Video download failed. File may be too large (>50MB limit).');
      }
      return;
    }

    // ── fb ────────────────────────────────────────────────────
    case 'fb': {
      const url = args[0];
      if (!url) return send('📌 Usage: `.fb <Facebook video URL>`');
      await send('⬇️ Downloading Facebook video...');
      try {
        const res = await axios.get(
          `https://api.lolhuman.xyz/api/facebook?url=${encodeURIComponent(url)}&apikey=loling`,
          { timeout: 20000 }
        );
        if (!res.data?.result) return send('❌ Could not fetch Facebook video.');
        const buf = await downloadBuffer(res.data.result);
        await sock.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption: '📘 Facebook Video' }, { quoted: msg });
      } catch { await send('❌ Facebook download failed. Check the URL.'); }
      return;
    }

    // ── tiktok ────────────────────────────────────────────────
    case 'tiktok': {
      const url = args[0];
      if (!url) return send('📌 Usage: `.tiktok <TikTok URL>`');
      await send('⬇️ Downloading TikTok...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/tiktok?url=${encodeURIComponent(url)}&apikey=free`,
          { timeout: 20000 }
        );
        if (!res.data?.data) return send('❌ TikTok download failed.');
        const { nowm, desc } = res.data.data;
        const buf = await downloadBuffer(nowm);
        await sock.sendMessage(from, {
          video: buf, mimetype: 'video/mp4',
          caption: `🎵 *${desc || 'TikTok Video'}*`,
        }, { quoted: msg });
      } catch { await send('❌ TikTok download failed.'); }
      return;
    }

    // ── insta ─────────────────────────────────────────────────
    case 'insta': {
      const url = args[0];
      if (!url) return send('📌 Usage: `.insta <Instagram URL>`');
      await send('⬇️ Downloading Instagram...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/instagram?url=${encodeURIComponent(url)}&apikey=free`,
          { timeout: 20000 }
        );
        if (!res.data?.data) return send('❌ Instagram download failed.');
        const media = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        for (const item of media.slice(0, 5)) {
          const isVid = item.type === 'video';
          const buf = await downloadBuffer(item.url);
          await sock.sendMessage(from, {
            [isVid ? 'video' : 'image']: buf,
            mimetype: isVid ? 'video/mp4' : 'image/jpeg',
            caption: '📸 Instagram',
          }, { quoted: msg });
        }
      } catch { await send('❌ Instagram download failed.'); }
      return;
    }

    // ── twitter ───────────────────────────────────────────────
    case 'twitter': {
      const url = args[0];
      if (!url) return send('📌 Usage: `.twitter <Twitter/X URL>`');
      await send('⬇️ Downloading Twitter video...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/twitter?url=${encodeURIComponent(url)}&apikey=free`,
          { timeout: 20000 }
        );
        if (!res.data?.data) return send('❌ Twitter download failed.');
        const { video, description } = res.data.data;
        const buf = await downloadBuffer(video);
        await sock.sendMessage(from, {
          video: buf, mimetype: 'video/mp4',
          caption: `🐦 ${description || 'Twitter Video'}`,
        }, { quoted: msg });
      } catch { await send('❌ Twitter download failed.'); }
      return;
    }

    // ── movie ─────────────────────────────────────────────────
    case 'movie': {
      if (!q) return send('📌 Usage: `.movie <movie name>`');
      await send('🎬 Searching movie info...');
      try {
        const res = await axios.get(
          `https://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=trilogy&type=movie`,
          { timeout: 10000 }
        );
        if (res.data.Response === 'False') return send('❌ Movie not found!');
        const m = res.data;
        const info =
`🎬 *${m.Title}* (${m.Year})
⭐ Rating: ${m.imdbRating}/10
🏷️ Genre: ${m.Genre}
🌍 Country: ${m.Country}
⏱️ Runtime: ${m.Runtime}
📝 Plot: ${m.Plot?.substring(0, 200)}...`;
        if (m.Poster && m.Poster !== 'N/A') {
          const buf = await downloadBuffer(m.Poster);
          await sock.sendMessage(from, { image: buf, caption: info }, { quoted: msg });
        } else {
          await send(info);
        }
      } catch { await send('❌ Movie search failed.'); }
      return;
    }

    // ── apk ───────────────────────────────────────────────────
    case 'apk': {
      if (!q) return send('📌 Usage: `.apk <app name>`');
      await send('📱 Searching APK...');
      try {
        const res = await axios.get(
          `https://api.lolhuman.xyz/api/apk?query=${encodeURIComponent(q)}&apikey=loling`,
          { timeout: 15000 }
        );
        if (!res.data?.result) return send('❌ APK not found!');
        const { name, version, size, download } = res.data.result;
        return send(`📱 *${name}*\n🔢 Version: ${version}\n📦 Size: ${size}\n🔗 Download: ${download}`);
      } catch { return send('❌ APK search failed.'); }
    }

    // ── img ───────────────────────────────────────────────────
    case 'img': {
      if (!q) return send('📌 Usage: `.img <search query>`');
      await send('🖼️ Searching images...');
      try {
        const res = await axios.get(
          `https://api.neoxr.eu/api/image?query=${encodeURIComponent(q)}&apikey=free`,
          { timeout: 15000 }
        );
        if (!res.data?.data?.length) return send('❌ No images found!');
        const imgs = res.data.data.slice(0, 3);
        for (const imgUrl of imgs) {
          const buf = await downloadBuffer(imgUrl);
          await sock.sendMessage(from, { image: buf, caption: `🖼️ *${q}*` }, { quoted: msg });
        }
      } catch { await send('❌ Image search failed.'); }
      return;
    }
  }
};
