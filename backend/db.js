const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database', 'arahloka.db');
const db = new sqlite3.Database(dbPath);

const imageMappings = [
  ["Desa Penglipuran", "/images/desa-panglipuran.jpg"],
  ["Candi Borobudur", "/images/borobudur.jpeg"],
  ["Kampung Adat Wae Rebo", "/images/wae-rebo.jpeg"],
  ["Pasar Terapung Lok Baintan", "/images/pasar-terapung-lok-baintan.jpg"],
  ["Keraton Yogyakarta", "/images/keraton-yogyakarta.jpg"],
  ["Tana Toraja", "/images/tana-toraja.jpg"]
];

const addColumnSafe = (tableName, columnName, definition) => {
  db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error(`Migration warning for ${tableName}.${columnName}:`, err.message);
    }
  });
};

const seedDestinations = () => {
  db.get("SELECT COUNT(*) as count FROM destinations", (err, row) => {
    if (err || !row) return;
    if (row.count === 0) {
      const destinations = [
        {
          name: "Desa Penglipuran",
          region: "Bali",
          mood_tags: "healing,cultural",
          duration_tags: "half day,one day",
          interest_tags: "local culture,traditional village",
          travel_style_tags: "relaxed,balanced",
          cultural_highlight: "One of the cleanest villages in the world with traditional Balinese architecture.",
          recommended_activity: "Walk through the bamboo forest and visit local traditional houses.",
          local_etiquette: "Dress modestly and ask permission before entering family compounds.",
          latitude: -8.4312,
          longitude: 115.3571,
          image_url: "/images/desa-panglipuran.jpg"
        },
        {
          name: "Candi Borobudur",
          region: "Jawa Tengah",
          mood_tags: "cultural,educational",
          duration_tags: "one day",
          interest_tags: "history,local culture",
          travel_style_tags: "balanced,exploration",
          cultural_highlight: "The largest Buddhist temple in the world and a UNESCO World Heritage site.",
          recommended_activity: "Sunrise tour and exploring the intricate stone carvings.",
          local_etiquette: "Wear a sarong (usually provided) and do not touch the stupas or reliefs.",
          latitude: -7.6079,
          longitude: 110.2038,
          image_url: "/images/borobudur.jpeg"
        },
        {
          name: "Kampung Adat Wae Rebo",
          region: "Nusa Tenggara Timur",
          mood_tags: "adventure,cultural",
          duration_tags: "two days,three days",
          interest_tags: "traditional village,nature",
          travel_style_tags: "exploration",
          cultural_highlight: "Iconic cone-shaped traditional houses (Mbaru Niang) in a remote mountain setting.",
          recommended_activity: "Trekking to the village and staying overnight in a Mbaru Niang.",
          local_etiquette: "Participate in the Waelu welcoming ceremony before exploring.",
          latitude: -8.7667,
          longitude: 120.2833,
          image_url: "/images/wae-rebo.jpeg"
        },
        {
          name: "Pasar Terapung Lok Baintan",
          region: "Kalimantan Selatan",
          mood_tags: "cultural,culinary",
          duration_tags: "half day",
          interest_tags: "local culture,culinary",
          travel_style_tags: "exploration,relaxed",
          cultural_highlight: "A traditional floating market where traders sell goods from small boats.",
          recommended_activity: "Take a klotok boat at dawn and try local Banjar snacks.",
          local_etiquette: "Greet the traders politely and be prepared for early morning starts.",
          latitude: -3.3444,
          longitude: 114.6556,
          image_url: "/images/pasar-terapung-lok-baintan.jpg"
        },
        {
          name: "Keraton Yogyakarta",
          region: "DI Yogyakarta",
          mood_tags: "cultural,educational",
          duration_tags: "half day,one day",
          interest_tags: "history,local culture",
          travel_style_tags: "relaxed,balanced",
          cultural_highlight: "The grand palace of the Sultan of Yogyakarta, a center of Javanese culture.",
          recommended_activity: "Watch traditional dance performances and explore the museum.",
          local_etiquette: "Do not wear hats inside the palace and speak softly.",
          latitude: -7.8053,
          longitude: 110.3642,
          image_url: "/images/keraton-yogyakarta.jpg"
        },
        {
          name: "Tana Toraja",
          region: "Sulawesi Selatan",
          mood_tags: "cultural,adventure",
          duration_tags: "two days,three days",
          interest_tags: "history,local culture,traditional village",
          travel_style_tags: "exploration",
          cultural_highlight: "Unique funeral rites, cave graves, and tongkonan traditional houses.",
          recommended_activity: "Visit the Lemo burial site and witness a Rambu Solo ceremony.",
          local_etiquette: "Always bring a gift (like coffee or sugar) if invited to a funeral ceremony.",
          latitude: -2.9833,
          longitude: 119.9,
          image_url: "/images/tana-toraja.jpg"
        }
      ];

      const stmt = db.prepare(`INSERT INTO destinations (
        name, region, mood_tags, duration_tags, interest_tags, travel_style_tags,
        cultural_highlight, recommended_activity, local_etiquette, latitude, longitude, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      destinations.forEach((d) => {
        stmt.run(
          d.name,
          d.region,
          d.mood_tags,
          d.duration_tags,
          d.interest_tags,
          d.travel_style_tags,
          d.cultural_highlight,
          d.recommended_activity,
          d.local_etiquette,
          d.latitude,
          d.longitude,
          d.image_url
        );
      });
      stmt.finalize();
    }
  });
};

const syncDestinationImageMappings = () => {
  // Keep curated local defaults only for empty rows, do not overwrite externally cached URLs.
  const updateImageStmt = db.prepare("UPDATE destinations SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = '')");
  imageMappings.forEach(([name, imagePath]) => {
    updateImageStmt.run(imagePath, name);
  });
  updateImageStmt.finalize();
};

const seedDefaultSuperadmin = () => {
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'", (err, row) => {
    if (err || !row) return;
    if (row.count === 0) {
      const passwordHash = bcrypt.hashSync("Admin123!", 10);
      db.run(
        "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
        ["ArahLoka Superadmin", "admin@arahloka.test", passwordHash, "superadmin", "approved"]
      );
    }
  });
};

const initDb = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      mood_tags TEXT NOT NULL,
      duration_tags TEXT NOT NULL,
      interest_tags TEXT NOT NULL,
      travel_style_tags TEXT NOT NULL,
      cultural_highlight TEXT,
      recommended_activity TEXT,
      local_etiquette TEXT,
      latitude REAL,
      longitude REAL,
      image_url TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS saved_trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      travel_mood TEXT,
      rating INTEGER,
      travel_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin','producer','consumer')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      duration TEXT,
      price REAL NOT NULL DEFAULT 0,
      quota INTEGER NOT NULL DEFAULT 1,
      latitude REAL,
      longitude REAL,
      image_url TEXT,
      media_type TEXT DEFAULT 'image',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden','draft')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(producer_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consumer_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      number_of_people INTEGER NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(consumer_id) REFERENCES users(id),
      FOREIGN KEY(offer_id) REFERENCES offers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS offer_itinerary_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      item_text TEXT NOT NULL,
      item_type TEXT DEFAULT 'preparation',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(offer_id) REFERENCES offers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS booking_checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      itinerary_item_id INTEGER,
      item_text TEXT NOT NULL,
      item_type TEXT DEFAULT 'preparation',
      is_checked INTEGER DEFAULT 0,
      checked_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(booking_id) REFERENCES bookings(id),
      FOREIGN KEY(itinerary_item_id) REFERENCES offer_itinerary_items(id)
    )`);

    addColumnSafe("saved_trips", "consumer_id", "INTEGER");
    addColumnSafe("destinations", "image_source", "TEXT");
    addColumnSafe("destinations", "image_attribution", "TEXT");
    addColumnSafe("destinations", "image_source_url", "TEXT");
    addColumnSafe("destinations", "image_last_checked_at", "TEXT");
    addColumnSafe("destinations", "external_summary", "TEXT");
    addColumnSafe("destinations", "external_info_source", "TEXT");
    addColumnSafe("destinations", "external_info_url", "TEXT");
    addColumnSafe("destinations", "external_info_last_checked_at", "TEXT");

    seedDestinations();
    syncDestinationImageMappings();
    seedDefaultSuperadmin();
  });
};

module.exports = { db, initDb };
