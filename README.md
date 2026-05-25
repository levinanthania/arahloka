# ArahLoka - Cultural Tourism & Exchange Platform

## 1. Project Description
ArahLoka is a modern full-stack web platform designed to provide personalized recommendations for cultural tourism destinations in Indonesia. The name "ArahLoka" is derived from "Arah" (Direction) and "Loka" (World/Place), signifying a guide to cultural places.

## 2. Chosen Topic and Reason
The chosen topic is **Tourism & Culture Exchange**. Indonesia is rich in diverse cultures and hidden gems that are often overlooked by conventional travel platforms. This project aims to bridge the gap between travelers and authentic cultural experiences.

## 3. Why ArahLoka fits Tourism & Culture Exchange
ArahLoka focus on more than just "popular spots." It highlights:
- **Cultural Etiquette:** Educating travelers on how to behave respectfully.
- **Cultural Highlights:** Promoting the unique heritage of each region.
- **Mood-Based Exploration:** Helping travelers connect with cultures that match their current state of mind.

## 4. Tech Stack and Reason
- **Frontend: React with Vite** - High performance, modern developer experience, and fast bundling.
- **Backend: Node.js with Express** - Scalable, widely supported, and perfect for lightweight JSON APIs.
- **Database: SQLite** - Self-managed, zero-configuration, and stores everything in a single local file, making it ideal for the current deployment stage.
- **Styling: Vanilla CSS** - Tailored, polished UI without the overhead of heavy frameworks.
- **Icons: Lucide-React** - Clean and consistent iconography.

## 5. Frontend Explanation
The frontend is a Single Page Application (SPA) built with React. It features:
- A responsive **Hero Section** for branding.
- A **Preference Quiz** that captures user's mood, duration, and style.
- Dynamic **Recommendation Cards** that fetch real-time weather data via the backend.
- A **Trip Log** system where users can save and view cultural experiences.

## 6. Backend Explanation
The backend is a RESTful API built with Express. It manages:
- **Database Connectivity:** Using `sqlite3` to interface with the local database.
- **Weather Proxy:** Fetching data from Open-Meteo to avoid CORS issues and simplify frontend logic.
- **Recommendation Logic:** A custom algorithm that scores destinations based on user input.

## 7. SQLite Database Location and Reason
- **Location:** `backend/database/arahloka.db`
- **Reason:** For this university assignment, a self-managed database is required. SQLite provides a robust relational database experience without the need for an external server like MySQL or a cloud service like Supabase.

## 8. Recommendation Algorithm Explanation
The algorithm uses a **Weight-Based Scoring System**:
- Each matching tag (Mood, Duration, Interest, Travel Style) adds **25%** to the match score.
- Results are sorted by the highest match percentage.
- It returns the top 3 destinations along with a dynamic reason for the recommendation.

## 9. Open-Meteo API Integration
The backend endpoint `GET /api/weather` accepts latitude and longitude. It calls the Open-Meteo Forecast API and returns:
- Current temperature.
- A weather insight (e.g., "Clear skies" or "Bring an umbrella") based on weather codes.

## 10. How to Run Backend
```bash
cd backend
npm install
npm run dev
```
The server will run on `http://localhost:3001`.

## 11. How to Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

## 12. Deployment Plan
1. **aaPanel:** Install Node.js Version Manager and PM2. Host the backend and frontend.
2. **Cloudflare Tunnel:** Use `cloudflared` to expose the ports (3001 and 5173) to the public internet securely without opening firewall ports.

## 13. Database Migration Note
SQLite is used as a self-managed database for this stage. It can be easily migrated to MySQL or MariaDB in the future by updating the `db.js` connector, as the data structure is already normalized.
