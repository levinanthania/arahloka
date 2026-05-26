const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const dbPath = path.join(__dirname, '..', 'database', 'arahloka.db');
const db = new sqlite3.Database(dbPath);

const DESTINATION_IMAGE_QUERIES = {
  'pasar terapung lok baintan': ['Pasar Terapung Lok Baintan', 'Lok Baintan floating market', 'Pasar Terapung Banjarmasin'],
  'keraton yogyakarta': ['Keraton Ngayogyakarta Hadiningrat', 'Keraton Yogyakarta', 'Yogyakarta Palace'],
  'tana toraja': ['Tana Toraja', 'Tongkonan Tana Toraja', 'Toraja traditional house'],
  'desa penglipuran': ['Desa Penglipuran', 'Penglipuran Village Bali'],
  'candi borobudur': ['Borobudur', 'Candi Borobudur'],
  'kampung adat wae rebo': ['Wae Rebo', 'Kampung Adat Wae Rebo']
};

const getQueries = (name) => {
  const key = String(name || '').trim().toLowerCase();
  const curated = DESTINATION_IMAGE_QUERIES[key] || [];
  return [...new Set([...curated, name].filter(Boolean))];
};

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function cb(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const getGoogleImage = async (name) => {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) return null;
  for (const query of getQueries(name)) {
    try {
      const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: GOOGLE_CSE_API_KEY, cx: GOOGLE_CSE_ID, q: `${query} Indonesia`, searchType: 'image', num: 1 },
        timeout: 7000
      });
      const item = res.data?.items?.[0];
      if (item?.link) {
        return {
          source: 'google_cse',
          image_url: item.link,
          attribution: 'Google Custom Search',
          source_url: item.image?.contextLink || item.link
        };
      }
    } catch {
      // Try next query
    }
  }
  return null;
};

const getWikiImage = async (name) => {
  for (const query of getQueries(name)) {
    try {
      const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: { action: 'query', list: 'search', srsearch: `${query} Indonesia`, srlimit: 3, format: 'json' },
        timeout: 7000
      });
      const results = searchRes.data?.query?.search || [];
      for (const result of results) {
        const title = result?.title;
        if (!title) continue;
        const imageRes = await axios.get('https://en.wikipedia.org/w/api.php', {
          params: { action: 'query', prop: 'pageimages|info', titles: title, pithumbsize: 1400, inprop: 'url', format: 'json' },
          timeout: 7000
        });
        const pages = imageRes.data?.query?.pages || {};
        const firstPage = Object.values(pages)[0];
        const imageUrl = firstPage?.thumbnail?.source;
        if (!imageUrl) continue;
        return {
          source: 'wikimedia',
          image_url: imageUrl,
          attribution: `Wikipedia/Wikimedia (${title})`,
          source_url: firstPage?.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
        };
      }
    } catch {
      // Try next query
    }
  }
  return null;
};

const refresh = async () => {
  const destinations = await all('SELECT id, name FROM destinations ORDER BY id');
  for (const dest of destinations) {
    const external = (await getGoogleImage(dest.name)) || (await getWikiImage(dest.name));
    if (!external?.image_url) {
      await run('UPDATE destinations SET image_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?', [dest.id]);
      console.log(`[SKIP] ${dest.name} -> no external image found`);
      continue;
    }
    await run(
      `UPDATE destinations
       SET image_url = ?, image_source = ?, image_attribution = ?, image_source_url = ?, image_last_checked_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [external.image_url, external.source, external.attribution, external.source_url || null, dest.id]
    );
    console.log(`[OK] ${dest.name} -> ${external.source} -> ${external.image_url}`);
  }
  db.close();
};

refresh().catch((err) => {
  console.error('Failed to refresh destination images:', err.message);
  db.close();
  process.exit(1);
});

