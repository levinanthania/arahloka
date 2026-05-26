Destination image filenames used by ArahLoka:

- `desa-panglipuran.jpg` -> Desa Penglipuran
- `borobudur.jpeg` -> Candi Borobudur
- `wae-rebo.jpeg` -> Kampung Adat Wae Rebo
- `pasar-terapung-lok-baintan.jpg` -> Pasar Terapung Lok Baintan
- `keraton-yogyakarta.jpg` -> Keraton Yogyakarta
- `tana-toraja.jpg` -> Tana Toraja

Fallback image flow:

1. Frontend tries local image path from destination `image_url`.
2. If image fails, frontend calls backend `GET /api/destination-image?name=...&refresh=1`.
3. Backend tries Wikimedia/Wikipedia lookup (safe public source).
4. If not found, backend returns fallback response and frontend shows:
   `Image needed: <Destination Name>`.

Optional Google Custom Search provider (not required):

- `GOOGLE_CSE_API_KEY`
- `GOOGLE_CSE_ID`

If these environment variables are not set, the app still works with local + Wikimedia + fallback.
