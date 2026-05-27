const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { db, initDb } = require('./db');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'arahloka-dev-secret-change-me';
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function cb(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const get = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safeBase = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${Date.now()}-${safeBase}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed (jpg, jpeg, png, gif).'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

initDb();

const createToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, status: user.status },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  created_at: user.created_at
});

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Pengguna tidak ditemukan' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
};

const authorizeRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Tidak terautorisasi' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Akses ditolak untuk role ini.' });
  next();
};

const resolveReadinessLabel = (percentage) => {
  if (percentage >= 80) return 'Siap Berangkat';
  if (percentage >= 50) return 'Perlu Dilengkapi';
  return 'Belum Siap';
};

const DESTINATION_IMAGE_QUERIES = {
  'pasar terapung lok baintan': ['Pasar Terapung Lok Baintan', 'Lok Baintan floating market', 'Pasar Terapung Banjarmasin'],
  'keraton yogyakarta': ['Keraton Ngayogyakarta Hadiningrat', 'Keraton Yogyakarta', 'Yogyakarta Palace'],
  'tana toraja': ['Tana Toraja', 'Tongkonan Tana Toraja', 'Toraja traditional house'],
  'desa penglipuran': ['Desa Penglipuran', 'Penglipuran Village Bali'],
  'candi borobudur': ['Borobudur', 'Candi Borobudur'],
  'kampung adat wae rebo': ['Wae Rebo', 'Kampung Adat Wae Rebo']
};

const getDestinationQueries = (name) => {
  const key = String(name || '').trim().toLowerCase();
  const curated = DESTINATION_IMAGE_QUERIES[key] || [];
  return [...new Set([...curated, name].filter(Boolean))];
};

const getWikipediaSummary = async (name) => {
  const queries = getDestinationQueries(name);
  // Try Indonesian Wikipedia first, then English
  const wikis = ['id', 'en'];
  
  for (const lang of wikis) {
    for (const query of queries) {
      try {
        const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
          params: {
            action: 'query',
            list: 'search',
            srsearch: query,
            srlimit: 3,
            format: 'json'
          },
          headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
          timeout: 7000
        });
        const results = searchRes.data?.query?.search || [];
        for (const result of results) {
          const title = result?.title;
          if (!title) continue;
          const summaryRes = await axios.get(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
            { 
              headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
              timeout: 7000 
            }
          );
          const extract = summaryRes.data?.extract;
          if (!extract) continue;
          return {
            source: lang === 'id' ? 'wikipedia_id' : 'wikipedia',
            summary: extract,
            source_url: summaryRes.data?.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
          };
        }
      } catch (error) {
        // Continue trying next query/lang
      }
    }
  }
  return null;
};

const normalizeRatingValue = (row) => ({
  ...row,
  average_rating: row.average_rating !== null && row.average_rating !== undefined ? Number(Number(row.average_rating).toFixed(1)) : null,
  rating_count: Number(row.rating_count || 0)
});

const buildChecklistSummary = (items) => {
  const total = items.length;
  const checkedRows = items.filter((item) => Number(item.is_checked) === 1);
  const missingRows = items.filter((item) => Number(item.is_checked) !== 1);
  const percentage = total === 0 ? 0 : Math.round((checkedRows.length / total) * 100);
  return {
    total_items: total,
    checked_items: checkedRows.length,
    missing_items: missingRows.length,
    readiness_percentage: percentage,
    ready_items: checkedRows.map((row) => row.item_text),
    missing_items_list: missingRows.map((row) => row.item_text),
    readiness_label: resolveReadinessLabel(percentage)
  };
};

const requireApprovedUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Tidak terautorisasi' });
  if (req.user.status === 'pending') {
    return res.status(403).json({ error: 'Akun Anda sedang menunggu persetujuan superadmin.' });
  }
  if (req.user.status === 'rejected') {
    return res.status(403).json({ error: 'Akun Anda telah ditolak.' });
  }
  next();
};

const getWikipediaImage = async (name) => {
  const queries = getDestinationQueries(name);
  const wikis = ['id', 'en'];

  for (const lang of wikis) {
    for (const query of queries) {
      try {
        const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
          params: {
            action: 'query',
            list: 'search',
            srsearch: query,
            srlimit: 3,
            format: 'json'
          },
          headers: { 'User-Agent': 'ArahLokaPlatform/1.0 (https://arahloka.test; admin@arahloka.test)' },
          timeout: 7000
        });
        const results = searchRes.data?.query?.search || [];
        for (const result of results) {
          const title = result?.title;
          if (!title) continue;
          const imageRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: {
              action: 'query',
              prop: 'pageimages|info',
              titles: title,
              pithumbsize: 1400,
              inprop: 'url',
              format: 'json'
            },
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
      } catch (error) {
        // Continue
      }
    }
  }
  return null;
};

const getGoogleImage = async (name) => {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) return null;
  const queries = getDestinationQueries(name);
  for (const query of queries) {
    try {
      const googleRes = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: GOOGLE_CSE_API_KEY,
          cx: GOOGLE_CSE_ID,
          q: `${query} Indonesia`,
          searchType: 'image',
          num: 1
        },
        timeout: 7000
      });
      const item = googleRes.data?.items?.[0];
      if (!item?.link) continue;
      return {
        source: 'google_cse',
        image_url: item.link,
        attribution: 'Google Custom Search',
        source_url: item.image?.contextLink || item.link
      };
    } catch (error) {
      // Continue trying next query.
    }
  }
  return null;
};

const resolveDestinationImage = async (name, refresh = false) => {
  const destination = await get('SELECT * FROM destinations WHERE LOWER(name) = LOWER(?)', [name]);
  if (!destination) {
    return {
      name,
      source: 'fallback',
      image_url: null,
      attribution: 'Destination not found in database'
    };
  }

  const localImage = destination.image_url && destination.image_url.startsWith('/images/');
  const existingExternalImage = destination.image_url && /^https?:\/\//i.test(destination.image_url);
  if (!refresh && existingExternalImage) {
    return {
      name: destination.name,
      source: destination.image_source || 'wikimedia',
      image_url: destination.image_url,
      attribution: destination.image_attribution || 'External image',
      source_url: destination.image_source_url || null
    };
  }

  const googleResult = await getGoogleImage(destination.name);
  if (googleResult?.image_url) {
    await run(
      'UPDATE destinations SET image_url = ?, image_source = ?, image_attribution = ?, image_source_url = ?, image_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [googleResult.image_url, 'google_cse', googleResult.attribution, googleResult.source_url || null, destination.id]
    );
    return { name: destination.name, ...googleResult };
  }

  const wikiResult = await getWikipediaImage(destination.name);
  if (wikiResult?.image_url) {
    await run(
      'UPDATE destinations SET image_url = ?, image_source = ?, image_attribution = ?, image_source_url = ?, image_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [wikiResult.image_url, 'wikimedia', wikiResult.attribution, wikiResult.source_url || null, destination.id]
    );
    return { name: destination.name, ...wikiResult };
  }

  await run(
    'UPDATE destinations SET image_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?',
    [destination.id]
  );
  return {
    name: destination.name,
    source: localImage ? 'local' : 'fallback',
    image_url: localImage ? destination.image_url : (destination.image_url || null),
    attribution: localImage ? (destination.image_attribution || 'Local fallback image') : 'No external image found.',
    source_url: null
  };
};

app.get('/api/destination-image', async (req, res) => {
  const name = (req.query.name || '').trim();
  const refresh = req.query.refresh === '1';
  if (!name) return res.status(400).json({ error: 'name query is required' });
  try {
    const result = await resolveDestinationImage(name, refresh);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve destination image' });
  }
});

app.get('/api/destination-info', async (req, res) => {
  const name = (req.query.name || '').trim();
  const refresh = req.query.refresh === '1';
  if (!name) return res.status(400).json({ error: 'name query is required' });
  try {
    const destination = await get('SELECT * FROM destinations WHERE LOWER(name) = LOWER(?)', [name]);
    if (!destination) {
      return res.json({ name, source: 'fallback', summary: 'Informasi belum tersedia.', source_url: null });
    }

    if (!refresh && destination.external_summary) {
      return res.json({
        name: destination.name,
        source: destination.external_info_source || 'wikipedia',
        summary: destination.external_summary,
        source_url: destination.external_info_url || null
      });
    }

    const wikiSummary = await getWikipediaSummary(destination.name);
    if (wikiSummary?.summary) {
      await run(
        `UPDATE destinations
         SET external_summary = ?, external_info_source = ?, external_info_url = ?, external_info_last_checked_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [wikiSummary.summary, wikiSummary.source, wikiSummary.source_url || null, destination.id]
      );
      return res.json({
        name: destination.name,
        source: wikiSummary.source,
        summary: wikiSummary.summary,
        source_url: wikiSummary.source_url || null
      });
    }

    await run('UPDATE destinations SET external_info_last_checked_at = CURRENT_TIMESTAMP WHERE id = ?', [destination.id]);

    return res.json({
      name: destination.name,
      source: 'local',
      summary: destination.cultural_highlight || 'Informasi lokal tersedia di platform.',
      source_url: null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch destination info' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!['producer', 'consumer'].includes(role)) {
      return res.status(400).json({ error: 'role must be producer or consumer for public registration' });
    }
    const existing = await get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, 'pending']
    );
    return res.status(201).json({ message: 'Registrasi berhasil. Akun Anda menunggu persetujuan superadmin.' });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = await get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Account is pending superadmin approval.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Account has been rejected.' });

    const token = createToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, requireApprovedUser, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/admin/users', authenticateToken, requireApprovedUser, authorizeRole('superadmin'), async (req, res) => {
  const users = await all(
    'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
});

app.get('/api/admin/users/pending', authenticateToken, requireApprovedUser, authorizeRole('superadmin'), async (req, res) => {
  const users = await all(
    "SELECT id, name, email, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC"
  );
  res.json(users);
});

app.patch('/api/admin/users/:id/approve', authenticateToken, requireApprovedUser, authorizeRole('superadmin'), async (req, res) => {
  const targetUser = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });
  if (targetUser.role === 'superadmin') {
    return res.status(400).json({ error: 'Superadmin account cannot be approved via this endpoint.' });
  }
  await run("UPDATE users SET status = 'approved' WHERE id = ?", [req.params.id]);
  res.json({ message: 'User approved' });
});

app.patch('/api/admin/users/:id/reject', authenticateToken, requireApprovedUser, authorizeRole('superadmin'), async (req, res) => {
  const targetUser = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });
  if (targetUser.role === 'superadmin') {
    return res.status(400).json({ error: 'Superadmin account cannot be rejected via this endpoint.' });
  }
  await run("UPDATE users SET status = 'rejected' WHERE id = ?", [req.params.id]);
  res.json({ message: 'User rejected' });
});

app.get('/api/offers', async (req, res) => {
  const offers = await all(
    `SELECT o.*, u.name as producer_name,
            (SELECT ROUND(AVG(st.rating), 1) FROM saved_trips st WHERE st.destination_name = o.title AND st.rating IS NOT NULL) as average_rating,
            (SELECT COUNT(*) FROM saved_trips st WHERE st.destination_name = o.title AND st.rating IS NOT NULL) as rating_count
     FROM offers o
     JOIN users u ON u.id = o.producer_id
     WHERE o.status = 'active'
     ORDER BY o.created_at DESC`
  );
  const enriched = await Promise.all(
    offers.map(async (offer) => {
      const countRow = await get('SELECT COUNT(*) as count FROM offer_itinerary_items WHERE offer_id = ?', [offer.id]);
      return normalizeRatingValue({ ...offer, itinerary_count: countRow?.count || 0 });
    })
  );
  res.json(enriched);
});

app.post('/api/offers', authenticateToken, requireApprovedUser, authorizeRole('producer'), upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      location,
      description,
      category,
      duration,
      price,
      quota,
      latitude,
      longitude
    } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({ error: 'title, location, and description are required' });
    }

    const normalizedQuota = Math.max(1, parseInt(quota || 1, 10));
    const normalizedPrice = Number(price || 0);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const insertResult = await run(
      `INSERT INTO offers (
        producer_id, title, location, description, category, duration, price, quota,
        latitude, longitude, image_url, media_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        req.user.id,
        title,
        location,
        description,
        category || null,
        duration || null,
        normalizedPrice,
        normalizedQuota,
        latitude || null,
        longitude || null,
        imageUrl,
        'image'
      ]
    );
    res.status(201).json({ id: insertResult.lastID, message: 'Offer created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

app.get('/api/offers/:id/itinerary', authenticateToken, requireApprovedUser, async (req, res) => {
  const offer = await get('SELECT * FROM offers WHERE id = ?', [req.params.id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  if (req.user.role === 'producer' && offer.producer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied for this role.' });
  }
  if (req.user.role === 'consumer') {
    const booking = await get('SELECT id FROM bookings WHERE offer_id = ? AND consumer_id = ?', [offer.id, req.user.id]);
    if (!booking && offer.status !== 'active') {
      return res.status(403).json({ error: 'Access denied for this role.' });
    }
  }

  const items = await all(
    'SELECT id, offer_id, item_text, item_type, sort_order, created_at FROM offer_itinerary_items WHERE offer_id = ? ORDER BY sort_order ASC, id ASC',
    [offer.id]
  );
  res.json({ offer_id: offer.id, offer_title: offer.title, items });
});

app.post('/api/offers/:id/itinerary', authenticateToken, requireApprovedUser, authorizeRole('producer'), async (req, res) => {
  const offer = await get('SELECT * FROM offers WHERE id = ?', [req.params.id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.producer_id !== req.user.id) return res.status(403).json({ error: 'Access denied for this role.' });

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  await run('DELETE FROM offer_itinerary_items WHERE offer_id = ?', [offer.id]);

  const stmt = db.prepare(
    'INSERT INTO offer_itinerary_items (offer_id, item_text, item_type, sort_order) VALUES (?, ?, ?, ?)'
  );
  items.forEach((item, index) => {
    const text = String(item.item_text || '').trim();
    if (!text) return;
    const type = 'itinerary';
    const sortOrder = Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1;
    stmt.run(offer.id, text, type, sortOrder);
  });
  stmt.finalize();
  res.json({ message: 'Itinerary items saved' });
});

app.patch('/api/offers/:id/itinerary/:itemId', authenticateToken, requireApprovedUser, authorizeRole('producer'), async (req, res) => {
  const offer = await get('SELECT * FROM offers WHERE id = ?', [req.params.id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.producer_id !== req.user.id) return res.status(403).json({ error: 'Access denied for this role.' });
  const item = await get('SELECT * FROM offer_itinerary_items WHERE id = ? AND offer_id = ?', [req.params.itemId, offer.id]);
  if (!item) return res.status(404).json({ error: 'Itinerary item not found' });

  const nextText = String(req.body.item_text ?? item.item_text).trim();
  const nextType = 'itinerary';
  const nextSort = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : item.sort_order;
  await run(
    'UPDATE offer_itinerary_items SET item_text = ?, item_type = ?, sort_order = ? WHERE id = ?',
    [nextText, nextType, nextSort, item.id]
  );
  res.json({ message: 'Itinerary item updated' });
});

app.get('/api/producer/offers', authenticateToken, requireApprovedUser, authorizeRole('producer'), async (req, res) => {
  const offers = await all(
    `SELECT o.*,
            (SELECT ROUND(AVG(st.rating), 1) FROM saved_trips st WHERE st.destination_name = o.title AND st.rating IS NOT NULL) as average_rating,
            (SELECT COUNT(*) FROM saved_trips st WHERE st.destination_name = o.title AND st.rating IS NOT NULL) as rating_count
     FROM offers o
     WHERE o.producer_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  const enriched = await Promise.all(
    offers.map(async (offer) => {
      const countRow = await get('SELECT COUNT(*) as count FROM offer_itinerary_items WHERE offer_id = ?', [offer.id]);
      return normalizeRatingValue({ ...offer, itinerary_count: countRow?.count || 0 });
    })
  );
  res.json(enriched);
});

app.patch('/api/offers/:id', authenticateToken, requireApprovedUser, authorizeRole('producer'), upload.single('image'), async (req, res) => {
  try {
    const offer = await get('SELECT * FROM offers WHERE id = ?', [req.params.id]);
    if (!offer) return res.status(404).json({ error: 'Penawaran tidak ditemukan' });
    if (offer.producer_id !== req.user.id) return res.status(403).json({ error: 'Anda tidak memiliki akses untuk penawaran ini' });

    const payload = {
      title: req.body.title ?? offer.title,
      location: req.body.location ?? offer.location,
      description: req.body.description ?? offer.description,
      category: req.body.category ?? offer.category,
      duration: req.body.duration ?? offer.duration,
      price: req.body.price !== undefined ? Number(req.body.price) : offer.price,
      quota: req.body.quota !== undefined ? Math.max(1, parseInt(req.body.quota, 10)) : offer.quota,
      latitude: req.body.latitude ?? offer.latitude,
      longitude: req.body.longitude ?? offer.longitude,
      image_url: req.file ? `/uploads/${req.file.filename}` : offer.image_url,
      status: req.body.status ?? offer.status
    };

    await run(
      `UPDATE offers SET
        title = ?, location = ?, description = ?, category = ?, duration = ?,
        price = ?, quota = ?, latitude = ?, longitude = ?, image_url = ?, status = ?
       WHERE id = ?`,
      [
        payload.title,
        payload.location,
        payload.description,
        payload.category,
        payload.duration,
        payload.price,
        payload.quota,
        payload.latitude,
        payload.longitude,
        payload.image_url,
        payload.status,
        offer.id
      ]
    );
    res.json({ message: 'Penawaran berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui penawaran' });
  }
});

app.delete('/api/offers/:id', authenticateToken, requireApprovedUser, authorizeRole('producer'), async (req, res) => {
  const offer = await get('SELECT * FROM offers WHERE id = ?', [req.params.id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.producer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await run("UPDATE offers SET status = 'hidden' WHERE id = ?", [offer.id]);
  res.json({ message: 'Offer hidden' });
});

app.post('/api/bookings', authenticateToken, requireApprovedUser, authorizeRole('consumer'), async (req, res) => {
  try {
    const { offer_id, booking_date, number_of_people, notes } = req.body;
    if (!offer_id || !booking_date || !number_of_people) {
      return res.status(400).json({ error: 'offer_id, booking_date, and number_of_people are required' });
    }

    const nPeople = parseInt(number_of_people, 10);
    if (Number.isNaN(nPeople) || nPeople <= 0) {
      return res.status(400).json({ error: 'number_of_people must be positive' });
    }

    const offer = await get("SELECT * FROM offers WHERE id = ? AND status = 'active'", [offer_id]);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (nPeople > offer.quota) {
      return res.status(400).json({ error: `number_of_people exceeds available quota (${offer.quota})` });
    }

    const result = await run(
      `INSERT INTO bookings (consumer_id, offer_id, booking_date, number_of_people, notes, status)
       VALUES (?, ?, ?, ?, ?, 'accepted')`,
      [req.user.id, offer.id, booking_date, nPeople, notes || null]
    );

    let itineraryItems = await all(
      'SELECT id, item_text, item_type, sort_order FROM offer_itinerary_items WHERE offer_id = ? ORDER BY sort_order ASC, id ASC',
      [offer.id]
    );
    if (itineraryItems.length === 0) {
      itineraryItems = [
        { id: null, item_text: 'Konfirmasi jadwal kunjungan', item_type: 'itinerary' },
        { id: null, item_text: 'Siapkan budget sesuai harga penawaran', item_type: 'itinerary' },
        { id: null, item_text: 'Pastikan jumlah peserta sesuai booking', item_type: 'itinerary' },
        { id: null, item_text: 'Siapkan transportasi menuju lokasi', item_type: 'itinerary' },
        { id: null, item_text: 'Bawa HP/kamera untuk dokumentasi', item_type: 'itinerary' }
      ];
    }

    const checklistStmt = db.prepare(
      'INSERT INTO booking_checklist_items (booking_id, itinerary_item_id, item_text, item_type, is_checked) VALUES (?, ?, ?, ?, 0)'
    );
    itineraryItems.forEach((item) => {
      checklistStmt.run(result.lastID, item.id, item.item_text, 'itinerary');
    });
    checklistStmt.finalize();

    res.status(201).json({ id: result.lastID, message: 'Booking berhasil dikonfirmasi.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.get('/api/bookings/:id/checklist', authenticateToken, requireApprovedUser, async (req, res) => {
  const booking = await get(
    `SELECT b.*, o.title as offer_title, o.producer_id
     FROM bookings b
     JOIN offers o ON o.id = b.offer_id
     WHERE b.id = ?`,
    [req.params.id]
  );
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isConsumerOwner = req.user.role === 'consumer' && booking.consumer_id === req.user.id;
  const isProducerOwner = req.user.role === 'producer' && booking.producer_id === req.user.id;
  const isAdmin = req.user.role === 'superadmin';
  if (!isConsumerOwner && !isProducerOwner && !isAdmin) {
    return res.status(403).json({ error: 'Access denied for this role.' });
  }

  const items = await all(
    `SELECT bci.id, bci.itinerary_item_id, bci.item_text, bci.item_type, bci.is_checked, bci.checked_at
     FROM booking_checklist_items bci
     WHERE bci.booking_id = ?
     ORDER BY bci.id ASC`,
    [booking.id]
  );

  res.json({
    booking_id: booking.id,
    offer_title: booking.offer_title,
    items,
    summary: buildChecklistSummary(items)
  });
});

app.patch('/api/bookings/:id/checklist/:checklistItemId', authenticateToken, requireApprovedUser, authorizeRole('consumer'), async (req, res) => {
  const booking = await get('SELECT * FROM bookings WHERE id = ? AND consumer_id = ?', [req.params.id, req.user.id]);
  if (!booking) return res.status(403).json({ error: 'Access denied for this role.' });
  const item = await get(
    'SELECT * FROM booking_checklist_items WHERE id = ? AND booking_id = ?',
    [req.params.checklistItemId, booking.id]
  );
  if (!item) return res.status(404).json({ error: 'Checklist item not found' });

  const isChecked = req.body.is_checked === true || req.body.is_checked === 1 || req.body.is_checked === '1';
  await run(
    'UPDATE booking_checklist_items SET is_checked = ?, checked_at = ? WHERE id = ?',
    [isChecked ? 1 : 0, isChecked ? new Date().toISOString() : null, item.id]
  );
  res.json({ message: 'Checklist item updated' });
});

app.get('/api/my-bookings', authenticateToken, requireApprovedUser, authorizeRole('consumer'), async (req, res) => {
  try {
    console.log('Fetching my bookings for user:', req.user);

    const bookings = await all(
      `SELECT
        b.id,
        b.consumer_id,
        b.offer_id,
        b.booking_date,
        b.number_of_people,
        b.notes,
        b.status,
        o.title AS title,
        o.title AS offer_title,
        o.location,
        o.description,
        o.category,
        o.duration,
        o.price,
        o.image_url,
        u.name AS producer_name
      FROM bookings b
      JOIN offers o ON b.offer_id = o.id
      LEFT JOIN users u ON o.producer_id = u.id
      WHERE b.consumer_id = ?
      ORDER BY b.id DESC`,
      [req.user.id]
    );

    res.json(bookings);
  } catch (err) {
    console.error('Failed to fetch my bookings:', err);
    res.status(500).json({
      error: 'Failed to fetch bookings',
      detail: err.message
    });
  }
});

app.get('/api/producer/bookings', authenticateToken, requireApprovedUser, authorizeRole('producer'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Auto expire accepted bookings whose date is older than today for all bookings related to this producer
    await run(
      `UPDATE bookings SET status = 'expired' 
       WHERE status = 'accepted' AND booking_date < ? 
       AND offer_id IN (SELECT id FROM offers WHERE producer_id = ?)`,
      [today, req.user.id]
    );

    const bookings = await all(
      `SELECT b.*, o.title as offer_title, o.location as offer_location, u.name as consumer_name, u.email as consumer_email
       FROM bookings b
       JOIN offers o ON o.id = b.offer_id
       JOIN users u ON u.id = b.consumer_id
       WHERE o.producer_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.patch('/api/bookings/:id', authenticateToken, requireApprovedUser, async (req, res) => {
  const { status, booking_date } = req.body;
  
  const booking = await get(
    `SELECT b.*, o.producer_id
     FROM bookings b
     JOIN offers o ON o.id = b.offer_id
     WHERE b.id = ?`,
    [req.params.id]
  );
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const isProducer = req.user.role === 'producer' && booking.producer_id === req.user.id;
  const isConsumer = req.user.role === 'consumer' && booking.consumer_id === req.user.id;

  if (!isProducer && !isConsumer) return res.status(403).json({ error: 'Akses ditolak' });

  const updates = [];
  const params = [];

  if (status) {
    if (isProducer) {
      if (!['accepted', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid untuk producer' });
      }
    } else {
      if (!['completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid untuk turis' });
      }
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (booking_date) {
    if (!isConsumer) return res.status(403).json({ error: 'Hanya turis yang dapat mengubah tanggal booking' });
    updates.push('booking_date = ?');
    params.push(booking_date);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diperbarui' });

  params.push(req.params.id);
  await run(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Booking berhasil diperbarui' });
});

app.get('/api/destinations', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM destinations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recommendations', async (req, res) => {
  const { mood, duration, interest, style } = req.body;
  try {
    const rows = await all('SELECT * FROM destinations');
    const recommendations = rows.map((dest) => {
      let score = 0;
      const reasons = [];
      if (dest.mood_tags.includes(mood)) {
        score += 25;
        reasons.push(`Cocok untuk suasana ${mood}.`);
      }
      if (dest.duration_tags.includes(duration)) {
        score += 25;
        reasons.push(`Sesuai dengan durasi ${duration}.`);
      }
      if (dest.interest_tags.includes(interest)) {
        score += 25;
        reasons.push(`Menarik untuk minat ${interest}.`);
      }
      if (dest.travel_style_tags.includes(style)) {
        score += 25;
        reasons.push(`Pas dengan gaya ${style}.`);
      }
      return {
        ...dest,
        match_percentage: score,
        reason: reasons.join(' ') || 'Pengalaman budaya yang luar biasa.'
      };
    });
    recommendations.sort((a, b) => b.match_percentage - a.match_percentage);
    res.json(recommendations.slice(0, 3));
  } catch (error) {
    res.status(500).json({ error: 'Failed to process recommendations' });
  }
});

app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Lat and Lon are required' });
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const weather = response.data.current_weather;
    let insight = 'Langit cerah untuk menjelajah!';
    if (weather.weathercode > 50) insight = 'Mungkin akan hujan, siapkan payung!';
    if (weather.temperature > 30) insight = 'Cuaca cukup terik, tetap terhidrasi!';
    res.json({ temp: weather.temperature, condition: weather.weathercode, insight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

app.get('/api/saved-trips', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM saved_trips ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/saved-trips', async (req, res) => {
  try {
    const { visitor_name, destination_name, travel_mood, rating, travel_note } = req.body;
    const consumerId = req.user?.role === 'consumer' ? req.user.id : null;
    const result = await run(
      `INSERT INTO saved_trips (visitor_name, destination_name, travel_mood, rating, travel_note, consumer_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [visitor_name, destination_name, travel_mood, rating, travel_note, consumerId]
    );
    res.json({ id: result.lastID, message: 'Trip saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
