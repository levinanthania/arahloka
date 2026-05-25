const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { db, initDb } = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// 1. GET /api/destinations
app.get('/api/destinations', (req, res) => {
  db.all("SELECT * FROM destinations", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. POST /api/recommendations
app.post('/api/recommendations', (req, res) => {
  const { mood, duration, interest, style } = req.body;

  db.all("SELECT * FROM destinations", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const recommendations = rows.map(dest => {
      let score = 0;
      let reasons = [];

      // Check Mood
      if (dest.mood_tags.includes(mood)) {
        score += 25;
        reasons.push(`Perfect for a ${mood} mood.`);
      }

      // Check Duration
      if (dest.duration_tags.includes(duration)) {
        score += 25;
        reasons.push(`Fits your ${duration} timeframe.`);
      }

      // Check Interest
      if (dest.interest_tags.includes(interest)) {
        score += 25;
        reasons.push(`Focuses on ${interest} which you like.`);
      }

      // Check Travel Style
      if (dest.travel_style_tags.includes(style)) {
        score += 25;
        reasons.push(`Matches your ${style} travel style.`);
      }

      return {
        ...dest,
        match_percentage: score,
        reason: reasons.join(' ') || "A great cultural experience overall."
      };
    });

    // Sort by match percentage
    recommendations.sort((a, b) => b.match_percentage - a.match_percentage);

    // Return top 3 recommendations
    res.json(recommendations.slice(0, 3));
  });
});

// 3. GET /api/weather?lat=...&lon=...
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Lat and Lon are required" });

  try {
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const weather = response.data.current_weather;
    
    // Simple weather insight
    let insight = "Clear skies for exploring!";
    if (weather.weathercode > 50) insight = "Might be rainy, bring an umbrella!";
    if (weather.temperature > 30) insight = "It's quite warm, stay hydrated!";

    res.json({
      temp: weather.temperature,
      condition: weather.weathercode,
      insight: insight
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// 4. GET /api/saved-trips
app.get('/api/saved-trips', (req, res) => {
  db.all("SELECT * FROM saved_trips ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 5. POST /api/saved-trips
app.post('/api/saved-trips', (req, res) => {
  const { visitor_name, destination_name, travel_mood, rating, travel_note } = req.body;
  
  const query = `INSERT INTO saved_trips (visitor_name, destination_name, travel_mood, rating, travel_note) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [visitor_name, destination_name, travel_mood, rating, travel_note], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: "Trip saved successfully!" });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
