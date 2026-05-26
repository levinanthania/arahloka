# Assignment 2 Implementation Notes (Interaksi Platform)

## 1. Roles and Access Control
- `superadmin`: approve/reject users and monitor users list.
- `producer`: create/manage cultural travel offers, manage bookings for own offers.
- `consumer`: view offers and book experiences, keep using recommendation/weather/journey features.

Authentication uses JWT with middleware:
- `authenticateToken`
- `authorizeRole(...roles)`

## 2. Database Tables and Purpose
- `users`: account identity, role, approval status.
- `offers`: producer-created travel offers with media path.
- `bookings`: consumer bookings tied to offers.
- `destinations`: recommendation destinations + image source/attribution columns.
- `saved_trips`: existing community trip logs (kept, additive nullable `consumer_id`).

## 3. Main Backend Endpoints
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Admin:
  - `GET /api/admin/users`
  - `GET /api/admin/users/pending`
  - `PATCH /api/admin/users/:id/approve`
  - `PATCH /api/admin/users/:id/reject`
- Destination image lookup:
  - `GET /api/destination-image?name=...`
- Offers:
  - `GET /api/offers`
  - `POST /api/offers` (multipart image upload)
  - `GET /api/producer/offers`
  - `PATCH /api/offers/:id`
  - `DELETE /api/offers/:id` (soft hide)
- Bookings:
  - `POST /api/bookings`
  - `GET /api/my-bookings`
  - `GET /api/producer/bookings`
  - `PATCH /api/bookings/:id/status`

## 4. Main Interactions for Sequence Diagrams
1. Producer creates cultural offer with media:
   - login as producer -> submit offer form + image upload -> backend validates role/file -> store file path in `offers.image_url` -> offer published.
2. Consumer views and books offer:
   - login as consumer -> fetch active offers -> submit booking form -> backend validates offer/quota -> create booking as `pending`.

## 5. Validation Rules
- Register role must be `producer` or `consumer`.
- Duplicate email rejected.
- Pending/rejected users cannot login.
- Offer create requires `title`, `location`, `description`.
- Upload allows only `jpg/jpeg/png/gif`.
- Booking requires positive `number_of_people` and must not exceed offer quota.
- Producer can only manage own offers/bookings.

## 6. Output of Interactions
- Offer creation output: `id`, success message.
- Booking creation output: `id`, `Booking submitted`.
- Booking status update output: success message with new status.
- Image lookup output:
  - `source: local | wikimedia | fallback`
  - `image_url`
  - `attribution`

## 7. Image and Media Handling
- Local curated destination image paths remain first priority.
- If image fails in frontend card, frontend calls `/api/destination-image`.
- Backend tries Wikipedia/Wikimedia lookup and can persist found URL + attribution.
- Producer offer images are uploaded to `backend/uploads` and served via `/uploads`.

## 8. External API Usage
- Open-Meteo: current weather widget (`/api/weather`).
- Wikipedia/Wikimedia ecosystem: destination image lookup.
- Optional Google Custom Search (if env set):
  - `GOOGLE_CSE_API_KEY`
  - `GOOGLE_CSE_ID`

## 9. Recommended Screenshots for Report
- Login and register screens.
- Pending approval message.
- Superadmin dashboard with pending users + approve/reject.
- Producer dashboard offer creation form + my offers.
- Consumer dashboard offers list + booking form + my bookings.
- Existing recommendation results with weather widget.
- Journey log form + community logs.
