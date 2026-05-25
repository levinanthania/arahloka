const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'arahloka.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  db.serialize(() => {
    // Destinations Table
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

    // Saved Trips Table
    db.run(`CREATE TABLE IF NOT EXISTS saved_trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      travel_mood TEXT,
      rating INTEGER,
      travel_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Data
    db.get("SELECT COUNT(*) as count FROM destinations", (err, row) => {
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
            image_url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2000"
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
            image_url: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2000"
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
            image_url: "https://images.unsplash.com/photo-1626245037233-04988775df58?q=80&w=2000"
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
            image_url: "https://images.unsplash.com/photo-1596402184320-417d7178b2cd?q=80&w=2000"
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
            image_url: "https://images.unsplash.com/photo-1604928141064-207cea6f571f?q=80&w=2000"
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
            longitude: 119.9000,
            image_url: "https://images.unsplash.com/photo-1620668045657-61f22e703965?q=80&w=2000"
          }
        ];

        const stmt = db.prepare(`INSERT INTO destinations (
          name, region, mood_tags, duration_tags, interest_tags, travel_style_tags, 
          cultural_highlight, recommended_activity, local_etiquette, latitude, longitude, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        destinations.forEach(d => {
          stmt.run(
            d.name, d.region, d.mood_tags, d.duration_tags, d.interest_tags, d.travel_style_tags,
            d.cultural_highlight, d.recommended_activity, d.local_etiquette, d.latitude, d.longitude, d.image_url
          );
        });
        stmt.finalize();
        console.log('Seeded destinations successfully.');
      }
    });
  });
};

module.exports = { db, initDb };
