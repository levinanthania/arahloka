const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const dbPath = path.join(__dirname, '..', 'database', 'arahloka.db');
const db = new sqlite3.Database(dbPath);

const DESTINATION_QUERIES = {
  'desa penglipuran': ['Desa Penglipuran Bali', 'Penglipuran Village Bali'],
  'candi borobudur': ['Candi Borobudur', 'Borobudur Temple'],
  'kampung adat wae rebo': ['Kampung Adat Wae Rebo', 'Wae Rebo village'],
  'pasar terapung lok baintan': ['Pasar Terapung Lok Baintan', 'Lok Baintan floating market'],
  'keraton yogyakarta': ['Keraton Yogyakarta', 'Keraton Ngayogyakarta Hadiningrat', 'Yogyakarta Palace'],
  'tana toraja': ['Tana Toraja', 'Tongkonan Tana Toraja']
};

const getQueries = (name) => {
  const key = String(name || '').trim().toLowerCase();
  const curated = DESTINATION_QUERIES[key] || [];
  return [...new Set([...curated, name].filter(Boolean))];
};

const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function cb(err) { if (err) return reject(err); resolve(this); }));

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
        return { source: 'google_cse', image_url: item.link, attribution: 'Google Custom Search', source_url: item.image?.contextLink || item.link };
      }
    } catch {
      // continue
    }
  }
  return null;
};

const getWikiImage = async (name) => {
  const queries = getQueries(name);
  const wikis = ['id', 'en'];

  for (const lang of wikis) {
    for (const query of queries) {
      try {
        const search = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
          params: { action: 'query', list: 'search', srsearch: query, srlimit: 3, format: 'json' },
          headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
          timeout: 7000
        });
        const results = search.data?.query?.search || [];
        for (const result of results) {
          const title = result?.title;
          if (!title) continue;
          const imageRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: { action: 'query', prop: 'pageimages|info', titles: title, pithumbsize: 1400, inprop: 'url', format: 'json' },
            headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
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
            source_url: firstPage?.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
          };
        }
      } catch {
        // continue
      }
    }
  }
  return null;
};

const getWikiSummary = async (name) => {
  const queries = getQueries(name);
  const wikis = ['id', 'en'];

  for (const lang of wikis) {
    for (const query of queries) {
      try {
        const search = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
          params: { action: 'query', list: 'search', srsearch: query, srlimit: 3, format: 'json' },
          headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
          timeout: 7000
        });
        const results = search.data?.query?.search || [];
        for (const result of results) {
          const title = result?.title;
          if (!title) continue;
          const summaryRes = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { 
            headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
            timeout: 7000 
          });
          const extract = summaryRes.data?.extract;
          if (!extract) continue;
          return {
            source: lang === 'id' ? 'wikipedia_id' : 'wikipedia',
            summary: extract,
            source_url: summaryRes.data?.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
          };
        }
      } catch {
        // continue
      }
    }
  }
  return null;
};

const refreshAll = async () => {
  const destinations = await all('SELECT id, name, image_url FROM destinations ORDER BY id ASC');
  for (const dest of destinations) {
    const image = (await getGoogleImage(dest.name)) || (await getWikiImage(dest.name));
    if (image?.image_url) {
      await run(
        `UPDATE destinations
         SET image_url = ?, image_source = ?, image_attribution = ?, image_source_url = ?, image_last_checked_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [image.image_url, image.source, image.attribution, image.source_url || null, dest.id]
      );
      console.log(`Updated ${dest.name} image from ${image.source}`);
    } else {
      await run('UPDATE destinations SET image_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?', [dest.id]);
      console.log(`No external image found for ${dest.name}`);
    }

    const summary = await getWikiSummary(dest.name);
    if (summary?.summary) {
      await run(
        `UPDATE destinations
         SET external_summary = ?, external_info_source = ?, external_info_url = ?, external_info_last_checked_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [summary.summary, summary.source, summary.source_url || null, dest.id]
      );
      console.log(`Updated ${dest.name} summary from ${summary.source}`);
    } else {
      await run('UPDATE destinations SET external_info_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?', [dest.id]);
      console.log(`No external summary found for ${dest.name}`);
    }
  }
  db.close();
};

refreshAll().catch((error) => {
  console.error('refresh-destination-content failed:', error.message);
  db.close();
  process.exit(1);
});

