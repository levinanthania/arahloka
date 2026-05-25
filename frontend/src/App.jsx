import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MapPin, Compass, Cloud, Thermometer, Star, Send, 
  Landmark, Heart, Sparkles, Navigation, History, Utensils,
  Sun, CloudRain, Info
} from 'lucide-react';

const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3001/api' 
  : 'https://api-arahloka.duskoide.org/api';

// Fallback data for static deployment
const FALLBACK_DESTINATIONS = [
  {
    id: 101,
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
    id: 102,
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
    id: 103,
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
    id: 104,
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
    id: 105,
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
    id: 106,
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

const App = () => {
  const [preferences, setPreferences] = useState({
    mood: 'healing',
    duration: 'one day',
    interest: 'nature',
    style: 'relaxed'
  });
  const [recommendations, setRecommendations] = useState([]);
  const [allDestinations, setAllDestinations] = useState(FALLBACK_DESTINATIONS);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [saveForm, setSaveForm] = useState({
    visitor_name: '',
    destination_name: '',
    travel_mood: 'healing',
    rating: 5,
    travel_note: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [destRes, tripsRes] = await Promise.all([
        axios.get(`${API_BASE}/destinations`, { timeout: 3000 }),
        axios.get(`${API_BASE}/saved-trips`, { timeout: 3000 })
      ]);
      setAllDestinations(destRes.data);
      setSavedTrips(tripsRes.data);
      setIsOffline(false);
    } catch (err) {
      console.error("Using fallback data - backend unreachable");
      setAllDestinations(FALLBACK_DESTINATIONS);
      setIsOffline(true);
      
      // Load from localStorage for offline mode
      const localTrips = localStorage.getItem('arahloka_saved_trips');
      if (localTrips) {
        setSavedTrips(JSON.parse(localTrips));
      }
    }
  };

  const handleGetRecommendations = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/recommendations`, preferences, { timeout: 3000 });
      setRecommendations(res.data);
      setIsOffline(false);
      
      if (res.data.length > 0) {
        setSaveForm(prev => ({ 
          ...prev, 
          destination_name: res.data[0].name, 
          travel_mood: preferences.mood 
        }));
      }
    } catch (err) {
      console.warn("Backend unavailable, generating client-side recommendations");
      setIsOffline(true);
      
      // Client-side recommendation logic
      const results = FALLBACK_DESTINATIONS.map(dest => {
        let score = 0;
        let reasons = [];
        if (dest.mood_tags.includes(preferences.mood)) { score += 25; reasons.push(`Perfect for a ${preferences.mood} mood.`); }
        if (dest.duration_tags.includes(preferences.duration)) { score += 25; reasons.push(`Fits your ${preferences.duration} timeframe.`); }
        if (dest.interest_tags.includes(preferences.interest)) { score += 25; reasons.push(`Focuses on ${preferences.interest}.`); }
        if (dest.travel_style_tags.includes(preferences.style)) { score += 25; reasons.push(`Matches your ${preferences.style} style.`); }
        
        return {
          ...dest,
          match_percentage: score,
          reason: reasons.join(' ') || "A beautiful cultural experience."
        };
      }).sort((a, b) => b.match_percentage - a.match_percentage).slice(0, 3);
      
      setRecommendations(results);
      if (results.length > 0) {
        setSaveForm(prev => ({ 
          ...prev, 
          destination_name: results[0].name, 
          travel_mood: preferences.mood 
        }));
      }
    } finally {
      setLoading(false);
      window.scrollTo({ top: 800, behavior: 'smooth' });
    }
  };

  const handleSaveTrip = async (e) => {
    e.preventDefault();
    const newTrip = {
      ...saveForm,
      id: Date.now(),
      created_at: new Date().toISOString()
    };

    try {
      await axios.post(`${API_BASE}/saved-trips`, saveForm, { timeout: 3000 });
      fetchInitialData();
      alert("Journey recorded successfully! Terima kasih.");
    } catch (err) {
      console.warn("Saving to localStorage - backend unreachable");
      setIsOffline(true);
      
      const currentLocalTrips = JSON.parse(localStorage.getItem('arahloka_saved_trips') || '[]');
      const updatedTrips = [newTrip, ...currentLocalTrips];
      localStorage.setItem('arahloka_saved_trips', JSON.stringify(updatedTrips));
      setSavedTrips(updatedTrips);
      alert("Backend unavailable. Journey saved locally to your browser! Terima kasih.");
    }
    
    setSaveForm({ visitor_name: '', destination_name: '', travel_mood: 'healing', rating: 5, travel_note: '' });
  };

  return (
    <div className="app-wrapper">
      <header>
        <div className="container nav-content">
          <a href="/" className="logo">
            <Compass size={32} />
            Arah<span>Loka</span>
          </a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {isOffline ? (
              <div className="status-badge offline">
                <Cloud size={14} />
                <span>Heritage Mode (Offline)</span>
              </div>
            ) : (
              <div className="status-badge online">
                <Sparkles size={14} />
                <span>Connected</span>
              </div>
            )}
            <span className="nav-tagline">
              INDONESIAN CULTURAL EXPLORER
            </span>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=2070')` }}>
        <div className="hero-content animate-fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(195, 157, 92, 0.2)', padding: '6px 16px', borderRadius: '50px', marginBottom: '20px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Sparkles size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>EXPLORE THE ARCHIPELAGO</span>
          </div>
          <h1>Discover Your Soul's Destination</h1>
          <p>Find hidden cultural gems across Indonesia tailored specifically to your current mood and travel preferences.</p>
        </div>
      </section>

      <main className="container">
        {/* Preference Quiz */}
        <div className="quiz-card animate-fade-up">
          <div className="section-header">
            <h2>Start Your Journey</h2>
            <p>Tell us how you want to experience Indonesia today.</p>
          </div>
          <form onSubmit={handleGetRecommendations}>
            <div className="quiz-grid">
              <div className="select-wrapper">
                <label>Current Mood</label>
                <select value={preferences.mood} onChange={(e) => setPreferences({...preferences, mood: e.target.value})}>
                  <option value="healing">🌿 Healing & Calm</option>
                  <option value="cultural">🎭 Deeply Cultural</option>
                  <option value="adventure">🌋 Adventurous</option>
                  <option value="culinary">🍲 Culinary Focus</option>
                  <option value="educational">📜 Learning & History</option>
                </select>
              </div>
              <div className="select-wrapper">
                <label>Time Available</label>
                <select value={preferences.duration} onChange={(e) => setPreferences({...preferences, duration: e.target.value})}>
                  <option value="half day">🕒 Half Day</option>
                  <option value="one day">☀️ Full Day</option>
                  <option value="two days">🌅 2 Days</option>
                  <option value="three days">✨ 3 Days+</option>
                </select>
              </div>
              <div className="select-wrapper">
                <label>Main Interest</label>
                <select value={preferences.interest} onChange={(e) => setPreferences({...preferences, interest: e.target.value})}>
                  <option value="nature">🍃 Nature & Outdoors</option>
                  <option value="local culture">🤝 Local Traditions</option>
                  <option value="history">🏛️ Historical Sites</option>
                  <option value="culinary">🌶️ Food Culture</option>
                  <option value="traditional village">🛖 Traditional Village</option>
                </select>
              </div>
              <div className="select-wrapper">
                <label>Travel Style</label>
                <select value={preferences.style} onChange={(e) => setPreferences({...preferences, style: e.target.value})}>
                  <option value="relaxed">🧘 Relaxed & Slow</option>
                  <option value="balanced">⚖️ Balanced Mix</option>
                  <option value="exploration">🧭 Deep Exploration</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>Finding Destinations...</>
              ) : (
                <>
                  <Navigation size={20} />
                  Find My Destination
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <section className="featured-section" id="recommendations">
            <div className="section-header">
              <h2>Top Matches for You</h2>
              <p>Based on your preferences, we think you'll love these places.</p>
            </div>
            <div className="dest-grid">
              {recommendations.map(dest => (
                <RecommendationCard key={dest.id} dest={dest} isRecommendation={true} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Destinations */}
        <section className="featured-section">
          <div className="section-header">
            <h2>Featured Cultural Gems</h2>
            <p>Popular destinations known for their rich Indonesian heritage.</p>
          </div>
          <div className="dest-grid">
            {allDestinations.map(dest => (
              <RecommendationCard key={dest.id} dest={dest} isRecommendation={false} />
            ))}
          </div>
        </section>

        {/* Record Journey Form */}
        <section className="record-card">
          <div className="section-header">
            <h2>Record Your Journey</h2>
            <p>Share your cultural experiences with the community.</p>
          </div>
          <form onSubmit={handleSaveTrip} className="record-form">
            <div className="form-group">
              <label>Your Name</label>
              <input 
                type="text" 
                value={saveForm.visitor_name} 
                onChange={(e) => setSaveForm({...saveForm, visitor_name: e.target.value})}
                placeholder="e.g., Citra Lestari"
                required
              />
            </div>
            <div className="form-group">
              <label>Destination</label>
              <input 
                type="text" 
                value={saveForm.destination_name} 
                onChange={(e) => setSaveForm({...saveForm, destination_name: e.target.value})}
                placeholder="Where did you go?"
                required
              />
            </div>
            <div className="form-group">
              <label>Experience Rating</label>
              <select value={saveForm.rating} onChange={(e) => setSaveForm({...saveForm, rating: parseInt(e.target.value)})}>
                <option value="5">⭐⭐⭐⭐⭐ Amazing</option>
                <option value="4">⭐⭐⭐⭐ Great</option>
                <option value="3">⭐⭐⭐ Good</option>
                <option value="2">⭐⭐ Okay</option>
                <option value="1">⭐ Poor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Travel Mood</label>
              <select value={saveForm.travel_mood} onChange={(e) => setSaveForm({...saveForm, travel_mood: e.target.value})}>
                <option value="healing">Healing</option>
                <option value="cultural">Cultural</option>
                <option value="adventure">Adventure</option>
                <option value="culinary">Culinary</option>
                <option value="educational">Educational</option>
              </select>
            </div>
            <div className="form-group form-full">
              <label>Cultural Insight</label>
              <textarea 
                rows="4" 
                value={saveForm.travel_note} 
                onChange={(e) => setSaveForm({...saveForm, travel_note: e.target.value})}
                placeholder="What cultural wisdom or memorable moment did you discover?"
              ></textarea>
            </div>
            <div className="form-full">
              <button type="submit" className="btn-primary">
                <Send size={18} />
                Save Journey Log
              </button>
            </div>
          </form>
        </section>

        {/* Saved Trips / Community Logs */}
        <section className="featured-section">
          <div className="section-header">
            <h2>Community Journey Logs</h2>
            <p>Recent cultural experiences shared by other travelers.</p>
          </div>
          {savedTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '16px' }}>
              <p style={{ color: '#999' }}>No journey logs yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="saved-trips-container">
              {savedTrips.map(trip => (
                <div key={trip.id} className="saved-trip-card animate-fade-up">
                  <div className="saved-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="visitor-tag">{trip.visitor_name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(trip.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3>{trip.destination_name}</h3>
                  </div>
                  <div className="stars">
                    {'★'.repeat(trip.rating)}{'☆'.repeat(5 - trip.rating)}
                  </div>
                  <p className="trip-note">"{trip.travel_note}"</p>
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px' }}>
                    <span className="region-badge" style={{ background: 'var(--secondary)', color: 'var(--primary)', fontSize: '0.7rem' }}>
                      {trip.travel_mood}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="logo" style={{ color: 'var(--white)', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Compass size={40} />
              Arah<span>Loka</span>
            </div>
            <h2>Discover Your Cultural Soul</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto', opacity: 0.8 }}>
              Bridging modern travelers with Indonesia's rich ancestral heritage through intelligent recommendations.
            </p>
          </div>
          <div className="copyright">
            © 2026 ArahLoka Platform • Heritage Technology Project • Indonesia
          </div>
        </div>
      </footer>
    </div>
  );
};

const RecommendationCard = ({ dest, isRecommendation }) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get(`${API_BASE}/weather?lat=${dest.latitude}&lon=${dest.longitude}`, { timeout: 2000 });
        setWeather(res.data);
      } catch (err) {
        console.warn("Weather service unavailable, using local estimate");
        // Fallback weather based on typical tropical climate
        setWeather({
          temp: 28,
          condition: 0,
          insight: "Tropical weather expected. Perfect for heritage walks!"
        });
      }
    };
    fetchWeather();
  }, [dest]);

  // CSS Gradient fallback if image fails or is missing
  const cardGradient = `linear-gradient(135deg, var(--primary), var(--accent))`;

  return (
    <div className="dest-card animate-fade-up">
      <div className="dest-image-wrapper" style={{ backgroundColor: 'var(--primary)', backgroundImage: cardGradient }}>
        {dest.image_url ? (
          <img 
            src={dest.image_url} 
            alt={dest.name} 
            className="dest-image" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
        <div className="dest-overlay">
          <span className="region-badge">{dest.region}</span>
          {isRecommendation && <span className="match-badge">{dest.match_percentage}% Match</span>}
        </div>
      </div>

      <div className="dest-content">
        <div className="dest-title-row">
          <h3>{dest.name}</h3>
        </div>
        
        {isRecommendation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', marginBottom: '15px', fontSize: '0.9rem', fontWeight: 600 }}>
            <Sparkles size={14} />
            <span>{dest.reason}</span>
          </div>
        )}

        <p className="dest-description">
          {dest.cultural_highlight}
        </p>

        <div className="dest-details-grid">
          <div className="detail-item">
            <h4><Navigation size={12} style={{ marginRight: 4 }} /> Best Activity</h4>
            <p>{dest.recommended_activity}</p>
          </div>
          <div className="detail-item">
            <h4><Info size={12} style={{ marginRight: 4 }} /> Local Tip</h4>
            <p>{dest.local_etiquette}</p>
          </div>
        </div>

        {weather && (
          <div className="weather-widget">
            <div className="weather-icon">
              {weather.condition > 50 ? <CloudRain color="#4A90E2" /> : <Sun color="#F5A623" />}
            </div>
            <div className="weather-info">
              <p className="temp">{weather.temp}°C</p>
              <p className="insight">{weather.insight}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
